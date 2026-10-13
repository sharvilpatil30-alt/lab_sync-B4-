-- Cancel a booking atomically and preserve its audit history.
CREATE OR REPLACE FUNCTION public.cancel_booking(
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
       WHERE id = p_actor_id AND role = 'lab_admin'
     ) THEN
    RAISE EXCEPTION 'Not authorized to cancel booking';
  END IF;

  IF v_booking.state IN ('CANCELLED', 'COMPLETED', 'REJECTED', 'EXPIRED') THEN
    RETURN false;
  END IF;

  UPDATE public.bookings
  SET state = 'CANCELLED',
      version = version + 1,
      updated_at = now()
  WHERE id = p_booking_id;

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
    'BOOKING_CANCELLED',
    jsonb_build_object('booking_id', p_booking_id, 'state', v_booking.state),
    jsonb_build_object('booking_id', p_booking_id, 'state', 'CANCELLED'),
    p_correlation_id
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid,uuid,text)
FROM PUBLIC, anon, authenticated;
