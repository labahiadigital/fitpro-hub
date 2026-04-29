import { Box, Text } from "@mantine/core";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect } from "react";
import { RichTextEditor as MantineRTE } from "@mantine/tiptap";
import "@mantine/tiptap/styles.css";

interface RichTextEditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  minHeight?: number;
  error?: string | null;
}

export function RichTextEditorField({
  value,
  onChange,
  label,
  description,
  placeholder,
  minHeight = 180,
  error,
}: RichTextEditorFieldProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Underline,
      TiptapLink.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "",
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const stripped = html.replace(/<p>\s*<\/p>/g, "").trim();
      onChange(stripped === "" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <Box>
      {label && (
        <Text fw={500} mb={4} size="sm">
          {label}
        </Text>
      )}
      {description && (
        <Text c="dimmed" mb={6} size="xs">
          {description}
        </Text>
      )}
      <MantineRTE editor={editor}>
        <MantineRTE.Toolbar sticky stickyOffset={0}>
          <MantineRTE.ControlsGroup>
            <MantineRTE.Bold />
            <MantineRTE.Italic />
            <MantineRTE.Underline />
            <MantineRTE.Strikethrough />
            <MantineRTE.ClearFormatting />
          </MantineRTE.ControlsGroup>
          <MantineRTE.ControlsGroup>
            <MantineRTE.H1 />
            <MantineRTE.H2 />
            <MantineRTE.H3 />
          </MantineRTE.ControlsGroup>
          <MantineRTE.ControlsGroup>
            <MantineRTE.BulletList />
            <MantineRTE.OrderedList />
          </MantineRTE.ControlsGroup>
          <MantineRTE.ControlsGroup>
            <MantineRTE.Link />
            <MantineRTE.Unlink />
          </MantineRTE.ControlsGroup>
          <MantineRTE.ControlsGroup>
            <MantineRTE.Undo />
            <MantineRTE.Redo />
          </MantineRTE.ControlsGroup>
        </MantineRTE.Toolbar>
        <MantineRTE.Content
          style={{ minHeight, fontSize: 14 }}
          data-placeholder={placeholder}
        />
      </MantineRTE>
      {error && (
        <Text c="red" mt={4} size="xs">
          {error}
        </Text>
      )}
    </Box>
  );
}
