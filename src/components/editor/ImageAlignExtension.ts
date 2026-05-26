import Image from "@tiptap/extension-image";

export type ImageAlignValue = "left" | "center" | "right";

export const ImageAlign = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center" as ImageAlignValue,
        parseHTML: (element) =>
          (element.getAttribute("data-align") as ImageAlignValue) || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align as string,
        }),
      },
    };
  },
});

export const imageAlignCss = `
  img[data-align="center"] {
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  img[data-align="left"] {
    display: block;
    margin-right: auto;
    margin-left: 0;
  }
  img[data-align="right"] {
    display: block;
    margin-left: auto;
    margin-right: 0;
  }
`;
