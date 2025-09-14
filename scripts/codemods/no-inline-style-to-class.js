/**
 * jscodeshift -t scripts/codemods/no-inline-style-to-class.js "app/**/*.{tsx,jsx}"
 * Only transforms simple, static inline styles: display:flex, gap:*, borderRadius, width:100%, height:*, etc.
 * Leaves dynamic expressions intact.
 */
const { parse } = require("recast");

const STYLE_MAP = {
  "display:flex": "flex",
  "display:grid": "grid",
  "flexWrap:wrap": "wrap",
  "justifyContent:space-between": "justify-between",
  "alignItems:baseline": "align-base",
  "gap:6": "gap-6",
  "gap:8": "gap-8",
  "gap:10": "gap-10",
  "gap:12": "gap-12",
  "marginTop:6": "mt-6",
  "marginTop:8": "mt-8",
  "marginTop:10": "mt-10",
  "marginTop:12": "mt-12",
  "width:100%": "w-full",
  "height:16": "h-16",
  "borderRadius:8": "round-8",
  "borderRadius:10": "round-10",
  "borderRadius:12": "round-12",
  "borderRadius:999": "round-999",
};

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.find(j.JSXAttribute, { name: { name: "style" } }).forEach(path => {
    const val = path.node.value;
    if (!val || val.type !== "JSXExpressionContainer") return;
    const obj = val.expression;
    if (!obj || obj.type !== "ObjectExpression") return;

    const classes = [];
    const keepProps = [];

    obj.properties.forEach(prop => {
      if (prop.type !== "Property" || prop.key.type !== "Identifier") { keepProps.push(prop); return; }
      const key = prop.key.name;
      const value = prop.value;
      if (value.type === "Literal" || value.type === "StringLiteral" || value.type === "NumericLiteral") {
        const lit = value.value;
        const mapKey = `${key}:${String(lit)}`;
        const cls = STYLE_MAP[mapKey];
        if (cls) return classes.push(cls);
      }
      // keep anything dynamic or unmapped
      keepProps.push(prop);
    });

    // Merge className
    if (classes.length) {
      const open = path.parent.node;
      const classAttr = open.attributes.find(a => a.type === "JSXAttribute" && a.name.name === "className");
      const classString = classes.join(" ");
      if (classAttr && classAttr.value && classAttr.value.type === "Literal") {
        classAttr.value.value = `${classAttr.value.value} ${classString}`.trim();
      } else if (classAttr && classAttr.value && classAttr.value.type === "JSXExpressionContainer" && classAttr.value.expression.type === "Literal") {
        classAttr.value.expression.value = `${classAttr.value.expression.value} ${classString}`.trim();
      } else if (classAttr) {
        // Fallback: wrap in template if needed
        classAttr.value = j.jsxExpressionContainer(j.templateLiteral(
          [j.templateElement({ raw: "", cooked: "" }, false), j.templateElement({ raw: ` ${classString}`, cooked: ` ${classString}` }, true)],
          [classAttr.value.expression]
        ));
      } else {
        open.attributes.push(j.jsxAttribute(j.jsxIdentifier("className"), j.literal(classString)));
      }
    }

    // Remove mapped style props; keep the rest (e.g., dynamic width/left)
    if (keepProps.length === 0) {
      // remove entire style attr
      j(path).remove();
    } else {
      path.node.value = j.jsxExpressionContainer(j.objectExpression(keepProps));
    }
  });

  return root.toSource({ quote: "double" });
};
