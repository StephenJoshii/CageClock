import {
  parseDurationToSeconds,
  formatDuration,
  formatViewCount,
} from "../../youtube-api"

jest.mock("../../youtube-api", () => ({
  parseDurationToSeconds: jest.requireActual("../../youtube-api").parseDurationToSeconds,
  formatDuration: jest.requireActual("../../youtube-api").formatDuration,
  formatViewCount: jest.requireActual("../../youtube-api").formatViewCount,
}))

describe("YouTube API Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("parseDurationToSeconds", () => {
    it("should parse hours correctly", () => {
      expect(parseDurationToSeconds("PT1H30M15S")).toBe(5415)
    })

    it("should parse minutes correctly", () => {
      expect(parseDurationToSeconds("PT4M13S")).toBe(253)
    })

    it("should parse seconds correctly", () => {
      expect(parseDurationToSeconds("PT30S")).toBe(30)
    })

    it("should handle zero duration", () => {
      expect(parseDurationToSeconds("PT0S")).toBe(0)
    })

    it("should handle malformed duration", () => {
      expect(parseDurationToSeconds("invalid")).toBe(0)
    })

    it("should handle missing hours/minutes/seconds", () => {
      expect(parseDurationToSeconds("PT")).toBe(0)
    })
  })

  describe("formatDuration", () => {
    it("should format hours:minutes:seconds", () => {
      expect(formatDuration("PT1H30M15S")).toBe("1:30:15")
    })

    it("should format minutes:seconds", () => {
      expect(formatDuration("PT4M13S")).toBe("4:13")
    })

    it("should format seconds only", () => {
      expect(formatDuration("PT30S")).toBe("0:30")
    })
  })

  describe("formatViewCount", () => {
    it("should format millions", () => {
      expect(formatViewCount("1234567")).toBe("1.2M views")
    })

    it("should format thousands", () => {
      expect(formatViewCount("12345")).toBe("12.3K views")
    })

    it("should format hundreds", () => {
      expect(formatViewCount("123")).toBe("123 views")
    })

    it("should handle zero", () => {
      expect(formatViewCount("0")).toBe("0 views")
    })

    it("should handle NaN", () => {
      expect(formatViewCount("invalid")).toBe("0 views")
    })
  })
})
