import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col">
        {children}
        <Footer />
      </div>
    </>
  );
}
