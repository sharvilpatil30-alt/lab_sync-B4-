-- ============================================================
-- Migration 004: Resource availability on book / cancel / return
-- Owner: Team C
-- ============================================================

-- 1. Ensure resources.state check constraint accommodates 'BOOKED' alongside 'ALLOCATED'
DO $$
BEGIN
  ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_state_check;
  ALTER TABLE public.resources
    ADD CONSTRAINT resources_state_check
    CHECK (state IN ('AVAILABLE','RESERVED','ALLOCATED','BOOKED','RELEASING','MAINTENANCE'));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- 2. Atomic booking commit procedure: marks resource ALLOCATED / in-use on success
CREATE OR REPLACE FUNCTION public.commit_booking(
  p_booking_id       uuid,
  p_resource_id      uuid,
  p_decision         text,      -- 'ALLOCATED' | 'WAITLISTED' | 'REJECTED'
  p_lease_id         text,
  p_request_id       text,
  p_policy           text,
  p_metrics          jsonb,
  p_route            jsonb,
  p_route_cost       numeric,
  p_algorithm        text,
  p_origin_node      uuid,
  p_destination_node uuid,
  p_actor_id         uuid,
  p_correlation_id   text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.bookings
    SET state = CASE
                  WHEN p_decision = 'ALLOCATED'  THEN 'CONFIRMED'
                  WHEN p_decision = 'WAITLISTED' THEN 'WAITLISTED'
                  ELSE 'REJECTED'
                END,
        resource_id = p_resource_id,
        updated_at = now()
    WHERE id = p_booking_id;

  INSERT INTO public.scheduling_decisions
    (booking_id, request_id, policy, decision, lease_id, metrics)
  VALUES
    (p_booking_id, p_request_id, p_policy, p_decision, p_lease_id, p_metrics);

  -- Atomic resource allocation
  IF p_decision = 'ALLOCATED' AND p_resource_id IS NOT NULL THEN
    UPDATE public.resources
      SET state = 'ALLOCATED',
          version = version + 1,
          updated_at = now()
      WHERE id = p_resource_id;
  END IF;

  IF p_route IS NOT NULL THEN
    INSERT INTO public.routes
      (booking_id, origin_node, destination_node, algorithm, path, cost)
    VALUES
      (p_booking_id, p_origin_node, p_destination_node, p_algorithm, p_route, p_route_cost);
  END IF;

  INSERT INTO public.audit_log (actor_id, action, after, correlation_id)
  VALUES (
    p_actor_id,
    'BOOKING_COMMIT',
    jsonb_build_object('booking_id', p_booking_id, 'decision', p_decision, 'resource_id', p_resource_id),
    p_correlation_id
  );
END;
$$;

-- 3. Atomic booking return / complete procedure: releases resource back to AVAILABLE
CREATE OR REPLACE FUNCTION public.complete_booking(
  p_booking_id uuid,
  p_actor_id uuid,
  p_correlation_id text
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_booking.user_id <> p_actor_id
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = p_actor_id AND role IN ('faculty', 'lab_admin')
     ) THEN
    RAISE EXCEPTION 'Not authorized to return/complete booking';
  END IF;

  IF v_booking.state IN ('CANCELLED', 'COMPLETED', 'REJECTED', 'EXPIRED') THEN
    RETURN false;
  END IF;

  UPDATE public.bookings
  SET state = 'COMPLETED',
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Release resource back to AVAILABLE if no other active booking holds it
  IF v_booking.resource_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.bookings
       WHERE resource_id = v_booking.resource_id
         AND id <> p_booking_id
         AND state IN ('LEASED', 'CONFIRMED', 'ACTIVE')
     ) THEN
    UPDATE public.resources
    SET state = 'AVAILABLE',
        version = version + 1,
        updated_at = now()
    WHERE id = v_booking.resource_id;
  END IF;

  INSERT INTO public.audit_log
    (actor_id, action, before, after, correlation_id)
  VALUES (
    p_actor_id,
    'BOOKING_COMPLETED',
    jsonb_build_object('booking_id', p_booking_id, 'state', v_booking.state),
    jsonb_build_object('booking_id', p_booking_id, 'state', 'COMPLETED'),
    p_correlation_id
  );

  RETURN true;
END;
$$;

-- Alias return_booking to complete_booking
CREATE OR REPLACE FUNCTION public.return_booking(
  p_booking_id uuid,
  p_actor_id uuid,
  p_correlation_id text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN public.complete_booking(p_booking_id, p_actor_id, p_correlation_id);
END;
$$;
