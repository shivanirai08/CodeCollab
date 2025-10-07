import React, { useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";

const MonacoEditor = ({ activeTab }) => {
  const [code, setCode] = useState("// start your code from here...");
  const monaco = useMonaco();

  React.useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("my-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#18181e",
        },
      });
      monaco.editor.setTheme("my-dark");
    }
  }, [monaco]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        onChange={(value) => setCode(value)}
      />
    </div>
  );
};

export default MonacoEditor;
