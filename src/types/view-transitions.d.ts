// View Transitions API TypeScript declarations

interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

// These interfaces extend the global types
declare global {
  interface Document {
    startViewTransition(updateCallback: () => void | Promise<void>): ViewTransition;
  }
  
  interface CSSStyleDeclaration {
    viewTransitionName: string;
  }
}

// Global augmentation for the View Transitions API
declare global {
  interface Document {
    startViewTransition(updateCallback: () => void | Promise<void>): ViewTransition;
  }
  
  interface CSSStyleDeclaration {
    viewTransitionName: string;
  }
}

export {};
