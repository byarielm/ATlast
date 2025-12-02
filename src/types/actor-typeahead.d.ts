import "react";

// uses npm install actor-typeahead
// from https://tangled.org/jakelazaroff.com/actor-typeahead <3

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "actor-typeahead": React.DetailedHTMLProps<
        {
          host?: string;
          rows?: number;
          children?: React.ReactNode;
        },
        HTMLElement
      >;
    }
  }
}
