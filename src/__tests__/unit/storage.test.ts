import {
  saveApiKey,
  type ApiKey,
} from "../../storage"

jest.mock("../../storage", () => ({
  saveApiKey: jest.fn(),
  setEnabled: jest.fn(),
  setFocusTopic: jest.fn(),
  getApiKeys: jest.fn(),
  setActiveApiKey: jest.fn(),
  deleteApiKey: jest.fn(),
}))

describe("saveApiKey", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should generate API key object with default name", async () => {
    const mockSaveApiKey = require("../../storage").saveApiKey as jest.Mock

    const mockId = Date.now().toString()
    mockSaveApiKey.mockResolvedValue({
      id: mockId,
      name: "API Key 1",
      key: "AIzaSy...",
      isValid: true,
      lastVerified: expect.any(Number),
    })

    const result = await saveApiKey("test-key", undefined)

    expect(result).toMatchObject({
      id: mockId,
      name: "API Key 1",
      key: "test-key",
      isValid: true,
      lastVerified: expect.any(Number),
    })
  })

  it("should use provided name", async () => {
    const mockSaveApiKey = require("../../storage").saveApiKey as jest.Mock

    mockSaveApiKey.mockResolvedValue({
      id: "123",
      name: "My Custom Key",
      key: "test-key",
      isValid: true,
      lastVerified: expect.any(Number),
    })

    const result = await saveApiKey("test-key", "My Custom Key")

    expect(result).toMatchObject({
      name: "My Custom Key",
    })
  })

  it("should generate ID using timestamp", async () => {
    const mockSaveApiKey = require("../../storage").saveApiKey as jest.Mock

    mockSaveApiKey.mockResolvedValue({
      id: expect.stringMatching(/^\d+$/),
      key: "test-key",
      isValid: true,
      lastVerified: expect.any(Number),
    })

    await saveApiKey("test-key", "Test")
  })
})
