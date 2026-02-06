export class UUIDMock {
  private counter: number;
  private readonly TEMPLATE = `00000000-0000-0000-0000-000000000000`;

  constructor() {
    this.counter = 0;
  }

  reset() {
    this.counter = 0;
  }

  v4(): string {
    this.counter++;
    return this.TEMPLATE.replace(
      /000$/,
      this.counter.toString().padStart(3, '0'),
    );
  }
}
