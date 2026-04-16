import Two from "two.js";

const { Anchor, Commands } = Two;

export class LineHead extends Two.Path {
  headLength = 10;
  headSpread = Math.PI * (35 / 180);

  constructor() {
    const vertices = [
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.move),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.move),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line),
    ];
    super(vertices, false, false, true);
    this.noFill();
    (this as any).__pathHeadType = "line";
  }

  _update() {
    const length = this.headLength;
    const spread = this.headSpread;

    const dx = -length * Math.cos(spread);
    const dy = length * Math.sin(spread);

    const v1 = this.vertices[0];
    const v2 = this.vertices[1];
    const v3 = this.vertices[2];
    const v4 = this.vertices[3];

    v1.x = 0;
    v1.y = 0;
    v3.x = 0;
    v3.y = 0;

    v2.x = dx;
    v2.y = -dy;
    v4.x = dx;
    v4.y = dy;

    return super._update();
  }
}
