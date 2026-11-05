"""Domain errors raised by services. The HTTP layer maps them to problem responses."""


class NotFoundError(Exception):
    def __init__(self, resource: str) -> None:
        super().__init__(f"{resource} not found")
        self.resource = resource


class VersionMismatchError(Exception):
    """The caller's version does not match the stored version."""
