/**
 * Mock for E2B sandbox in test environment.
 * Prevents Jest from trying to parse ESM-only e2b/chalk packages.
 */

export class Sandbox {
  static async create({ template, apiKey }: { template?: string; apiKey?: string }) {
    return new Sandbox();
  }

  async close() {
    // no-op
  }

  get port(): any {
    return {
      open: async () => ({ url: 'https://mock-preview.example.com' }),
      close: async () => {},
    };
  }

  async writeFile(_path: string, _content: string) {
    // no-op
  }

  async readFile(_path: string) {
    return '';
  }
}

export default Sandbox;
