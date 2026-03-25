import { Modal, type ModalProps } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

interface BottomSheetProps extends ModalProps {
  desktopSize?: string;
}

/**
 * Centered Modal on desktop, bottom-sheet on mobile.
 * On mobile the panel slides up from the bottom with rounded top corners,
 * occupying at most 85dvh and scrolling internally.
 */
export function BottomSheet({
  desktopSize,
  children,
  size,
  ...props
}: BottomSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const resolvedDesktopSize = desktopSize ?? size ?? "lg";

  if (isMobile) {
    return (
      <Modal
        {...props}
        size="100%"
        fullScreen={false}
        transitionProps={{ transition: "slide-up", duration: 250 }}
        styles={{
          ...props.styles,
          content: {
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            top: "auto",
            maxHeight: "85dvh",
            borderRadius: "16px 16px 0 0",
            display: "flex",
            flexDirection: "column" as const,
            ...(typeof props.styles === "object" && props.styles && "content" in props.styles
              ? (props.styles as Record<string, Record<string, unknown>>).content
              : {}),
          },
          body: {
            flex: 1,
            overflowY: "auto" as const,
            padding: "var(--mantine-spacing-md)",
            ...(typeof props.styles === "object" && props.styles && "body" in props.styles
              ? (props.styles as Record<string, Record<string, unknown>>).body
              : {}),
          },
          inner: {
            padding: 0,
            alignItems: "flex-end",
          },
        }}
      >
        {children}
      </Modal>
    );
  }

  return (
    <Modal {...props} size={resolvedDesktopSize}>
      {children}
    </Modal>
  );
}
