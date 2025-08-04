import "@testing-library/jest-dom";
/** Global axios mock to avoid ESM parsing issues in Jest */
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    create: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
  },
}));
