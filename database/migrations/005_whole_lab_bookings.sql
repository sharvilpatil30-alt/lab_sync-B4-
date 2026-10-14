-- Apply before deploying the faculty booking feature. No existing rows are deleted.
BEGIN;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_scope text NOT NULL DEFAULT 'WORKSTATION'
  CHECK (booking_scope IN ('WORKSTATION','WHOLE_LAB'));
CREATE TABLE IF NOT EXISTS public.booking_claims (
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  PRIMARY KEY (booking_id,resource_id),
  EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at,end_at,'[)') WITH &&)
);
ALTER TABLE public.booking_claims ENABLE ROW LEVEL SECURITY;
-- Backend-only writes; UI reads availability through the authenticated API.
CREATE OR REPLACE FUNCTION public.refresh_booking_claims() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM public.labs WHERE id=NEW.lab_id FOR UPDATE;
  DELETE FROM public.booking_claims WHERE booking_id=NEW.id;
  IF NEW.state IN ('LEASED','CONFIRMED','ACTIVE') THEN
    IF NEW.booking_scope='WHOLE_LAB' AND NEW.resource_id IS NOT NULL THEN
      RAISE EXCEPTION 'Whole-lab bookings cannot target a single resource' USING ERRCODE='23514';
    END IF;
    IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.id<>NEW.id AND b.lab_id=NEW.lab_id
      AND b.state IN ('LEASED','CONFIRMED','ACTIVE') AND b.start_at<NEW.end_at AND b.end_at>NEW.start_at
      AND (NEW.booking_scope='WHOLE_LAB' OR b.booking_scope='WHOLE_LAB')) THEN
      RAISE EXCEPTION 'Whole-lab reservation overlaps another reservation' USING ERRCODE='23P01';
    END IF;
    IF NEW.booking_scope='WHOLE_LAB' THEN
      INSERT INTO public.booking_claims SELECT NEW.id,r.id,NEW.start_at,NEW.end_at FROM public.resources r WHERE r.lab_id=NEW.lab_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory has no bookable resources' USING ERRCODE='23514'; END IF;
    ELSIF NEW.resource_id IS NOT NULL THEN
      INSERT INTO public.booking_claims VALUES(NEW.id,NEW.resource_id,NEW.start_at,NEW.end_at);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS booking_claims_refresh ON public.bookings;
CREATE TRIGGER booking_claims_refresh AFTER INSERT OR UPDATE OF state,resource_id,lab_id,start_at,end_at,booking_scope ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.refresh_booking_claims();
INSERT INTO public.booking_claims SELECT id,resource_id,start_at,end_at FROM public.bookings
WHERE state IN ('LEASED','CONFIRMED','ACTIVE') AND resource_id IS NOT NULL
ON CONFLICT (booking_id,resource_id) DO NOTHING;
COMMIT;
