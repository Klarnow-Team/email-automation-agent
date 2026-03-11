"""Parse User-Agent for email client name, device, and reading environment."""
from typing import Optional, Tuple

# Web-based clients (count as "webmail" when on desktop)
_WEBMAIL_CLIENTS = frozenset({"Gmail", "Yahoo Mail", "Outlook", "AOL", "ProtonMail", "iCloud Mail"})


def parse_user_agent(ua: Optional[str]) -> Tuple[str, str, str]:
    """
    Return (email_client, device, environment).
    email_client: "Gmail", "Apple Mail", "Outlook", etc.
    device: "desktop", "mobile", "tablet"
    environment: "webmail", "desktop", "mobile" (for reading environment)
    """
    if not ua or not ua.strip():
        return "Other", "desktop", "desktop"
    ua_lower = ua.lower()
    # Device
    if "ipad" in ua_lower or "tablet" in ua_lower or "playbook" in ua_lower:
        device = "tablet"
    elif "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower or "ipod" in ua_lower or "webos" in ua_lower or "blackberry" in ua_lower:
        device = "mobile"
    else:
        device = "desktop"
    # Email client (common patterns in open-tracking requests)
    if "gmail" in ua_lower or ("google" in ua_lower and "mail" in ua_lower):
        client = "Gmail"
    elif "outlook" in ua_lower or "microsoft" in ua_lower and "office" in ua_lower or "ms-office" in ua_lower:
        client = "Outlook"
    elif "apple mail" in ua_lower or "applemail" in ua_lower or ("macos" in ua_lower and "mail" in ua_lower):
        client = "Apple Mail"
    elif "yahoo" in ua_lower or "ymail" in ua_lower:
        client = "Yahoo Mail"
    elif "samsung" in ua_lower and ("mail" in ua_lower or "email" in ua_lower):
        client = "Samsung Email"
    elif "thunderbird" in ua_lower:
        client = "Thunderbird"
    elif "protonmail" in ua_lower or "proton" in ua_lower:
        client = "ProtonMail"
    elif "aol" in ua_lower:
        client = "AOL"
    elif "icloud" in ua_lower:
        client = "iCloud Mail"
    elif "samsung" in ua_lower:
        client = "Samsung"
    elif "android" in ua_lower or "iphone" in ua_lower:
        client = "Mobile (generic)"
    else:
        client = "Other"
    # Reading environment: webmail | desktop | mobile
    if device in ("mobile", "tablet"):
        environment = "mobile"
    elif device == "desktop" and client in _WEBMAIL_CLIENTS:
        environment = "webmail"
    else:
        environment = "desktop"
    return client, device, environment
