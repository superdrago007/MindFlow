import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def _smtp_config() -> dict[str, str | int]:
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASS", "").strip()
    sender = os.getenv("SMTP_FROM", "").strip()

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "sender": sender,
    }


def send_email(recipient: str, subject: str, body: str) -> None:
    """
    Sends mail via SMTP when configured.
    Falls back to backend logs for local development when SMTP is unavailable.
    """
    config = _smtp_config()

    if not config["host"] or not config["sender"]:
        logger.warning(
            "SMTP is not configured. Falling back to log-only mail for recipient=%s subject=%s body=%s",
            recipient,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = str(config["sender"])
    message["To"] = recipient
    message.set_content(body)

    try:
        with smtplib.SMTP(str(config["host"]), int(config["port"]), timeout=10) as smtp_client:
            smtp_client.starttls()

            if config["username"]:
                smtp_client.login(str(config["username"]), str(config["password"]))

            smtp_client.send_message(message)
    except Exception as exc:
        logger.exception(
            "SMTP delivery failed. Falling back to log-only mail for recipient=%s subject=%s error=%s body=%s",
            recipient,
            subject,
            exc,
            body,
        )
