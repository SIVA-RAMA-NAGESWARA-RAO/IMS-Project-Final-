from sqlalchemy import Column, BigInteger, String, SmallInteger, Boolean, DateTime, func
from database import Base


class RecruitmentEvent(Base):
    """
    Append-only log of recruitment lifecycle events, pushed here by the
    Node/MongoDB backend. This relational table is the source for every
    report in Module 10 (funnel, time-to-hire, interviewer performance).
    """

    __tablename__ = "recruitment_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_type = Column(String(64), nullable=False)
    application_id = Column(String(64))
    job_id = Column(String(64))
    candidate_id = Column(String(64))
    interview_id = Column(String(64))
    interviewer_id = Column(String(64))
    offer_id = Column(String(64))
    status = Column(String(64))
    rating = Column(SmallInteger)
    recommendation = Column(String(32))
    is_backup = Column(Boolean, default=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
