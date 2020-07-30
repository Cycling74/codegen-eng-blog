mgraphics.relative_coords = 1;

function cls_1() {
  mgraphics.set_source_rgba(0.08235294117647059, 1, 0.7019607843137254, 1);
}

function cls_2() {
  mgraphics.set_source_rgba(0.2901960784313726, 0.7294117647058823, 1, 1);
}

function cls_3() {
  mgraphics.set_source_rgba(1, 0, 0.6470588235294118, 1);
}

function cls_4() {
  mgraphics.set_source_rgba(0, 0.5411764705882353, 0.9137254901960784, 1);
}

function calcAspect() {
  var width = this.box.rect[2] - this.box.rect[0];
  var height = this.box.rect[3] - this.box.rect[1];
  return width / height;
}

function paint() {
  const aspect = calcAspect();
  mgraphics.save();
  cls_1();
  mgraphics.rectangle(-0.5979945047163131 * aspect, 0.8753894080996885, 0.16429198651672663 * aspect, 1.1651090342679127);
  mgraphics.fill();
  mgraphics.restore();
  mgraphics.save();
  cls_2();
  mgraphics.rectangle(0.4387445826133758 * aspect, 0.8753894080996885, 0.16429198651672663 * aspect, 1.1651090342679127);
  mgraphics.fill();
  mgraphics.restore();
  mgraphics.save();
  cls_3();
  mgraphics.rectangle(-1 * aspect, 1, 2 * aspect, 0.2554517133956386);
  mgraphics.fill();
  mgraphics.restore();
  mgraphics.save();
  cls_4();
  mgraphics.rectangle(-0.11814859926918386 * aspect, 0.9127725856697819, 0.26972211993315015 * aspect, 1.912772585669782);
  mgraphics.fill();
  mgraphics.restore();
}