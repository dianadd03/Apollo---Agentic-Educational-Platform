from pydantic import BaseModel, Field, field_validator, model_validator


class TaskExample(BaseModel):
    input: str = Field(..., min_length=1)
    output: str = Field(..., min_length=1)


class FoundationalTask(BaseModel):
    title: str = Field(..., min_length=1)
    task: str = Field(..., min_length=1)
    examples: list[TaskExample] = Field(..., min_length=1)


class FoundationalTasksRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)

    @field_validator("topic")
    @classmethod
    def strip_topic(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Topic must not be empty.")
        return cleaned


class FoundationalTasksResponse(BaseModel):
    topic: str = Field(..., min_length=1)
    foundational_tasks: list[FoundationalTask] = Field(..., min_length=1)

    @field_validator("topic")
    @classmethod
    def strip_response_topic(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Agent response topic must not be empty.")
        return cleaned

    @model_validator(mode="after")
    def ensure_tasks(self) -> "FoundationalTasksResponse":
        if not self.foundational_tasks:
            raise ValueError("Agent returned no foundational tasks.")
        return self
