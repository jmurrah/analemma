type LayoutContainerProps = {
  children: React.ReactNode;
};

export default function LayoutContainer({ children }: LayoutContainerProps) {
  return (
    <div className="w-full h-full flex flex-col max-w-3xl">{children}</div>
  );
}
