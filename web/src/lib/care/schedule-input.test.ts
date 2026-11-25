import { describe, expect, it } from "vitest";
import { parseCareScheduleInput } from "./schedule-input";

describe("care schedule input validation", () => {
  it("accepts a feeding schedule with optional portion", () => {
    expect(
      parseCareScheduleInput({
        kind: "feeding",
        mealName: "Comida",
        portion: null,
        dayOfWeek: 7,
        scheduledTime: "08:30",
        isActive: true,
      }),
    ).toMatchObject({
      kind: "feeding",
      mealName: "Comida",
      dayOfWeek: 7,
      scheduledTime: "08:30",
    });
  });

  it("rejects invalid days, dates, times, and duplicate medication times", () => {
    expect(
      parseCareScheduleInput({
        kind: "feeding",
        mealName: "Comida",
        dayOfWeek: 0,
        scheduledTime: "25:90",
        isActive: true,
      }),
    ).toBeNull();

    expect(
      parseCareScheduleInput({
        kind: "medication",
        medicationName: "Medicamento",
        instructions: "Con comida",
        startDate: "2026-02-30",
        endDate: null,
        times: [{ dayOfWeek: 1, scheduledTime: "08:00" }],
        isActive: true,
      }),
    ).toBeNull();

    expect(
      parseCareScheduleInput({
        kind: "medication",
        medicationName: "Medicamento",
        instructions: "Con comida",
        startDate: "2026-02-28",
        endDate: "2026-02-27",
        times: [
          { dayOfWeek: 1, scheduledTime: "08:00" },
          { dayOfWeek: 1, scheduledTime: "08:00" },
        ],
        isActive: true,
      }),
    ).toBeNull();
  });
});
