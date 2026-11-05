import enum
import uuid
from datetime import date, datetime

from sqlalchemy import CHAR, DateTime, ForeignKey, String, Uuid, func, text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class BloodType(enum.StrEnum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"
    UNKNOWN = "unknown"


class PatientStatus(enum.StrEnum):
    ACTIVE = "active"
    FOLLOW_UP = "follow_up"
    INACTIVE = "inactive"


def _values(enum_class: type[enum.Enum]) -> list[str]:
    return [str(member.value) for member in enum_class]


class PatientAllergy(Base):
    __tablename__ = "patient_allergies"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[int] = mapped_column(nullable=False)


class PatientCondition(Base):
    __tablename__ = "patient_conditions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[int] = mapped_column(nullable=False)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(20))
    address_line1: Mapped[str | None] = mapped_column(String(200))
    address_line2: Mapped[str | None] = mapped_column(String(200))
    address_city: Mapped[str | None] = mapped_column(String(100))
    address_region: Mapped[str | None] = mapped_column(String(100))
    address_postal_code: Mapped[str | None] = mapped_column(String(20))
    address_country: Mapped[str | None] = mapped_column(CHAR(2))
    blood_type: Mapped[BloodType] = mapped_column(
        ENUM(BloodType, name="blood_type", values_callable=_values, create_type=False),
        nullable=False,
        server_default=BloodType.UNKNOWN.value,
    )
    status: Mapped[PatientStatus] = mapped_column(
        ENUM(PatientStatus, name="patient_status", values_callable=_values, create_type=False),
        nullable=False,
        server_default=PatientStatus.ACTIVE.value,
    )
    version: Mapped[int] = mapped_column(nullable=False, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    allergies: Mapped[list[PatientAllergy]] = relationship(
        order_by=PatientAllergy.position,
        cascade="all, delete-orphan",
        lazy="raise",
    )
    conditions: Mapped[list[PatientCondition]] = relationship(
        order_by=PatientCondition.position,
        cascade="all, delete-orphan",
        lazy="raise",
    )
