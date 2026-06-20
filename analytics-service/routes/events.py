from flask import Blueprint, request, jsonify
from database import SessionLocal
from models import RecruitmentEvent

events_bp = Blueprint("events", __name__)


@events_bp.route("/events", methods=["POST"])
def ingest_event():
    """
    Receives a single recruitment lifecycle event from the Node backend
    (application created/status changed, interview scheduled/rescheduled,
    feedback submitted, offer released/responded, onboarding initiated)
    and writes it into the relational event log.
    """
    body = request.get_json(force=True) or {}
    event_type = body.get("event_type")
    payload = body.get("payload", {})
    occurred_at = body.get("occurred_at")

    if not event_type or not occurred_at:
        return jsonify({"error": "event_type and occurred_at are required"}), 400

    db = SessionLocal()
    try:
        event = RecruitmentEvent(
            event_type=event_type,
            application_id=str(payload.get("applicationId", "")) or None,
            job_id=str(payload.get("jobId", "")) or None,
            candidate_id=str(payload.get("candidateId", "")) or None,
            interview_id=str(payload.get("interviewId", "")) or None,
            interviewer_id=str(payload.get("interviewerId", "")) or None,
            offer_id=str(payload.get("offerId", "")) or None,
            status=payload.get("status"),
            rating=payload.get("rating"),
            recommendation=payload.get("recommendation"),
            is_backup=bool(payload.get("isBackup", False)),
            occurred_at=occurred_at,
        )
        db.add(event)
        db.commit()
        return jsonify({"message": "event recorded", "id": event.id}), 201
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        db.close()
