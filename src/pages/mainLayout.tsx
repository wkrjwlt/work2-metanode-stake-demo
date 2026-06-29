
import Headers from "../components/Headers"
export default function MainLayout({ children }: { children: React.ReactNode }){
    return (
        <div className="min-h-full flex flex-col">
            <Headers></Headers>
            <div className="bg-yellow-700 w-full min-h-screen mt-20">
                {children}
            </div>
        </div>
    )
}