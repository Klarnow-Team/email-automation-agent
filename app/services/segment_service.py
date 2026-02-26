"""
Evaluate segment rules against subscribers. No external dependency.
Rules format: list of rules. Each rule can be:
- Simple: {"field": "status", "op": "eq", "value": "active"}
- Nested: {"and": [rule, ...]} or {"or": [rule, ...]}

Supported simple fields: status, email, name, in_group, not_in_group, has_tag, not_has_tag,
  custom_field (use "key"), created_at, opened_campaign, clicked_campaign.
"""
from datetime import datetime, timezone, timedelta
from typing import List

from sqlalchemy.orm import Session

from app.models.subscriber import Subscriber
from app.models.group import SubscriberGroup
from app.models.tag import SubscriberTag
from app.models.tracking import TrackingEvent


def _evaluate_rule(db: Session, rule: dict) -> List[int]:
    """Return subscriber ids matching a single rule (simple or compound)."""
    if not rule:
        return [r[0] for r in db.query(Subscriber.id).all()]

    if "and" in rule:
        conditions = rule["and"]
        if not conditions:
            return [r[0] for r in db.query(Subscriber.id).all()]
        result = None
        for r in conditions:
            ids = _evaluate_rule(db, r)
            if result is None:
                result = set(ids)
            else:
                result &= set(ids)
        return list(result or [])

    if "or" in rule:
        conditions = rule["or"]
        if not conditions:
            return []
        result = set()
        for r in conditions:
            result |= set(_evaluate_rule(db, r))
        return list(result)

    field = rule.get("field")
    op = rule.get("op")
    value = rule.get("value")
    key = rule.get("key")  # for custom_field

    if field == "status":
        col = Subscriber.status
        if op == "eq":
            q = db.query(Subscriber.id).filter(col == value)
        elif op == "ne":
            q = db.query(Subscriber.id).filter(col != value)
        else:
            return []
        return [r[0] for r in q.all()]

    if field == "email":
        col = Subscriber.email
        if op == "eq":
            q = db.query(Subscriber.id).filter(col == value)
        elif op == "ne":
            q = db.query(Subscriber.id).filter(col != value)
        elif op == "contains":
            q = db.query(Subscriber.id).filter(col.contains(value))
        elif op == "startswith":
            q = db.query(Subscriber.id).filter(col.startswith(value))
        else:
            return []
        return [r[0] for r in q.all()]

    if field == "name":
        col = Subscriber.name
        if op == "eq":
            q = db.query(Subscriber.id).filter(col == value)
        elif op == "ne":
            q = db.query(Subscriber.id).filter(col != value)
        elif op == "contains":
            q = db.query(Subscriber.id).filter(col.contains(value))
        elif op == "startswith":
            q = db.query(Subscriber.id).filter(col.startswith(value))
        elif op == "empty":
            from sqlalchemy import or_
            q = db.query(Subscriber.id).filter(or_(col.is_(None), col == ""))
        else:
            return []
        return [r[0] for r in q.all()]

    if field == "in_group":
        group_id = value if isinstance(value, int) else int(value)
        ids = [r[0] for r in db.query(SubscriberGroup.subscriber_id).filter(SubscriberGroup.group_id == group_id).all()]
        return ids

    if field == "not_in_group":
        group_id = value if isinstance(value, int) else int(value)
        in_group = set(
            r[0] for r in db.query(SubscriberGroup.subscriber_id).filter(SubscriberGroup.group_id == group_id).all()
        )
        all_ids = [r[0] for r in db.query(Subscriber.id).all()]
        return [i for i in all_ids if i not in in_group]

    if field == "has_tag":
        tag_id = value if isinstance(value, int) else int(value)
        ids = [r[0] for r in db.query(SubscriberTag.subscriber_id).filter(SubscriberTag.tag_id == tag_id).all()]
        return ids

    if field == "not_has_tag":
        tag_id = value if isinstance(value, int) else int(value)
        has_tag = set(
            r[0] for r in db.query(SubscriberTag.subscriber_id).filter(SubscriberTag.tag_id == tag_id).all()
        )
        all_ids = [r[0] for r in db.query(Subscriber.id).all()]
        return [i for i in all_ids if i not in has_tag]

    if field == "custom_field" and key:
        from sqlalchemy import or_
        # JSONB: custom_fields->key (NULL when key missing or value null)
        if op == "eq":
            q = db.query(Subscriber.id).filter(Subscriber.custom_fields[key].astext == str(value))
        elif op == "ne":
            q = db.query(Subscriber.id).filter(Subscriber.custom_fields[key].astext != str(value))
        elif op == "contains":
            q = db.query(Subscriber.id).filter(Subscriber.custom_fields[key].astext.contains(str(value)))
        elif op == "empty":
            q = db.query(Subscriber.id).filter(
                or_(
                    Subscriber.custom_fields[key].astext.is_(None),
                    Subscriber.custom_fields[key].astext == "",
                )
            )
        else:
            return []
        return [r[0] for r in q.all()]

    if field == "created_at":
        try:
            days = int(value)
        except (TypeError, ValueError):
            return []
        now = datetime.now(timezone.utc)
        if op == "within_days":
            since = now - timedelta(days=days)
            q = db.query(Subscriber.id).filter(Subscriber.created_at >= since)
        elif op == "older_than_days":
            since = now - timedelta(days=days)
            q = db.query(Subscriber.id).filter(Subscriber.created_at < since)
        else:
            return []
        return [r[0] for r in q.all()]

    if field == "opened_campaign":
        campaign_id = value if isinstance(value, int) else int(value)
        q = (
            db.query(TrackingEvent.subscriber_id)
            .filter(
                TrackingEvent.campaign_id == campaign_id,
                TrackingEvent.event_type == "open",
                TrackingEvent.subscriber_id.isnot(None),
            )
            .distinct()
        )
        return [r[0] for r in q.all()]

    if field == "clicked_campaign":
        campaign_id = value if isinstance(value, int) else int(value)
        q = (
            db.query(TrackingEvent.subscriber_id)
            .filter(
                TrackingEvent.campaign_id == campaign_id,
                TrackingEvent.event_type == "click",
                TrackingEvent.subscriber_id.isnot(None),
            )
            .distinct()
        )
        return [r[0] for r in q.all()]

    return []


def evaluate_segment(db: Session, rules: List[dict] | None) -> List[int]:
    """Return list of subscriber ids matching the rules. Empty rules = all subscribers.
    Top-level list is AND: subscriber must match every rule in the list."""
    if not rules:
        return [r[0] for r in db.query(Subscriber.id).all()]
    result = None
    for rule in rules:
        ids = _evaluate_rule(db, rule)
        if result is None:
            result = set(ids)
        else:
            result &= set(ids)
    return list(result or [])
