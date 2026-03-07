export const texTagMocks: ContentParserMock[] = [
  {
    input: `[tex]hello world[/tex]`,
    expected: `<span class="katex-placeholder" data-katex-source="hello%20world"></span>`,
  },
];
