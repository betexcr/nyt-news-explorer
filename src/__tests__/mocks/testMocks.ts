import "@testing-library/jest-dom";

/** Global axios mock to avoid ESM parsing issues in Jest */
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));

/** Mock SwaggerUI component to avoid test issues */
jest.mock('swagger-ui-react', () => {
  const React = require('react');
  return function MockSwaggerUI(props: any) {
    return React.createElement('div', {
      className: props.className,
      'data-testid': 'swagger-ui',
      children: [
        React.createElement('div', { key: 'mock-1' }, 'Mock SwaggerUI Component'),
        React.createElement('div', { key: 'mock-2' }, `Spec loaded: ${props.spec ? 'Yes' : 'No'}`)
      ]
    });
  };
});

/** Mock swagger-ui-react CSS import */
jest.mock('swagger-ui-react/swagger-ui.css', () => ({}));

/** Mock js-yaml for YAML parsing */
jest.mock('js-yaml', () => ({
  load: jest.fn((_yaml) => {
    // Return a mock OpenAPI spec
    return {
      swagger: '2.0',
      info: {
        title: 'Mock API',
        version: '1.0.0'
      },
      paths: {},
      definitions: {}
    };
  })
})); 