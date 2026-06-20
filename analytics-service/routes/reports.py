from flask import Blueprint, jsonify
import pandas as pd
from sqlalchemy import text
from database import engine

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/reports/funnel", methods=["GET"])
def funnel():
    """Recruitment funnel: candidate counts by latest known status (Module 10 / Module 8)."""
    query = """
        SELECT status, COUNT(DISTINCT application_id) AS candidate_count
        FROM recruitment_events
        WHERE event_type = 'application_status_changed' AND status IS NOT NULL
        GROUP BY status
        ORDER BY candidate_count DESC
    """
    df = pd.read_sql(text(query), engine)
    return jsonify(df.to_dict(orient="records"))


@reports_bp.route("/reports/time-to-hire", methods=["GET"])
def time_to_hire():
    """Average days between application creation and offer release, per job."""
    query = """
        WITH applied AS (
            SELECT application_id, job_id, occurred_at AS applied_at
            FROM recruitment_events
            WHERE event_type = 'application_created'
        ),
        offered AS (
            SELECT application_id, occurred_at AS offered_at
            FROM recruitment_events
            WHERE event_type = 'offer_released'
        )
        SELECT
            a.job_id,
            COUNT(*) AS offers_made,
            ROUND(AVG(EXTRACT(EPOCH FROM (o.offered_at - a.applied_at)) / 86400.0)::numeric, 1) AS avg_days_to_offer
        FROM applied a
        JOIN offered o ON o.application_id = a.application_id
        GROUP BY a.job_id
        ORDER BY avg_days_to_offer ASC
    """
    df = pd.read_sql(text(query), engine)
    return jsonify(df.to_dict(orient="records"))


@reports_bp.route("/reports/interviewer-performance", methods=["GET"])
def interviewer_performance():
    """Average rating and recommendation mix submitted by each interviewer."""
    query = """
        SELECT
            interviewer_id,
            COUNT(*) AS feedback_count,
            ROUND(AVG(rating)::numeric, 2) AS avg_rating,
            SUM(CASE WHEN recommendation = 'select' THEN 1 ELSE 0 END) AS recommended_select,
            SUM(CASE WHEN recommendation = 'reject' THEN 1 ELSE 0 END) AS recommended_reject,
            SUM(CASE WHEN recommendation = 'hold' THEN 1 ELSE 0 END) AS recommended_hold
        FROM recruitment_events
        WHERE event_type = 'feedback_submitted'
        GROUP BY interviewer_id
        ORDER BY avg_rating DESC
    """
    df = pd.read_sql(text(query), engine)
    return jsonify(df.to_dict(orient="records"))


@reports_bp.route("/reports/offer-acceptance", methods=["GET"])
def offer_acceptance():
    """Offer acceptance rate, including backup-candidate offers (Module 11)."""
    query = """
        SELECT
            is_backup,
            status,
            COUNT(*) AS offer_count
        FROM recruitment_events
        WHERE event_type IN ('offer_released', 'offer_response')
        GROUP BY is_backup, status
        ORDER BY is_backup, status
    """
    df = pd.read_sql(text(query), engine)
    return jsonify(df.to_dict(orient="records"))
