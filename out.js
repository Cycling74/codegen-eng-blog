mgraphics.relative_coords = 1;

function calcAspect() {
  var width = this.box.rect[2] - this.box.rect[0];
  var height = this.box.rect[3] - this.box.rect[1];
  return width / height;
}

function paint() {
  const aspect = calcAspect();
  mgraphics.rectangle(-1 * aspect, 0.21824104234527686, 0.32712915961646927 * aspect, 1.218241042345277);
  mgraphics.fill();
  mgraphics.rectangle(-0.3122391426959955 * aspect, 0.5570032573289903, 0.41804850535815 * aspect, 1.5570032573289903);
  mgraphics.fill();
  mgraphics.rectangle(0.4630569655950365 * aspect, 1, 0.5370558375634518 * aspect, 2);
  mgraphics.fill();
}