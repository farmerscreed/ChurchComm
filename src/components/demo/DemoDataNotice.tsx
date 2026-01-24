import { Info } from "lucide-react";

export function DemoDataNotice() {
    return (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900">
                <p className="font-medium">Sample data loaded</p>
                <p className="mt-1 text-blue-800">
                    This demo data allows you to explore the platform. It will be automatically
                    cleared when you add your first real person to the database.
                </p>
            </div>
        </div>
    );
}
