import Two from "two.js";

const { Anchor, Commands } = Two;

export class TriangleHead extends Two.Path {
  headLength = 10;
  headSpread = Math.PI * (35 / 180);

  constructor() {
    const vertices = [
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.move),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line),
    ];
    super(vertices, true, false, true);
    this.noFill();
    (this as any).__pathHeadType = "triangle";
  }

  _update() {
    const length = this.headLength;
    const spread = this.headSpread;

    const dx = -length * Math.cos(spread);
    const dy = length * Math.sin(spread);

    const v1 = this.vertices[0];
    const v2 = this.vertices[1];
    const v3 = this.vertices[2];

    v1.x = 0;
    v1.y = 0;

    v2.x = dx;
    v2.y = -dy;
    v3.x = dx;
    v3.y = dy;

    return super._update();
  }
}
