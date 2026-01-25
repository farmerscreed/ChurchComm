import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Battery, Signal, Wifi } from "lucide-react";

interface PhonePreviewProps {
    message: string;
    senderName?: string;
}

export function PhonePreview({ message, senderName = "Church" }: PhonePreviewProps) {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
            <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>

            <div className="rounded-[2rem] overflow-hidden w-full h-full bg-background dark:bg-slate-950 flex flex-col relative">
                {/* Status Bar */}
                <div className="pt-3 px-6 flex justify-between items-center text-[10px] font-medium select-none z-10 text-foreground">
                    <span>{currentTime}</span>
                    <div className="flex items-center gap-1.5">
                        <Signal className="h-3 w-3" />
                        <Wifi className="h-3 w-3" />
                        <Battery className="h-3 w-3" />
                    </div>
                </div>

                {/* Header */}
                <div className="px-4 py-3 border-b bg-muted/30 backdrop-blur-sm z-10 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {senderName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold">{senderName}</span>
                        <span className="text-[10px] text-muted-foreground">Text Message</span>
                    </div>
                </div>

                {/* Chat Area */}
                <ScrollArea className="flex-1 p-4 bg-muted/10">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1 items-center my-4">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Today</span>
                        </div>

                        {/* Received Message Bubble (Simulated Previous Context) */}
                        <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2 bg-muted text-xs shadow-sm">
                            <p>Welcome to {senderName}! Reply STOP to unsubscribe.</p>
                        </div>

                        {/* Staging Message Bubble (The Preview) */}
                        {message && (
                            <div className="self-end max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2 bg-primary text-primary-foreground text-xs shadow-sm transition-all animate-in zoom-in-95 duration-200">
                                <p className="break-words leading-relaxed whitespace-pre-wrap">
                                    {message || "Typing..."}
                                </p>
                            </div>
                        )}

                        {!message && (
                            <div className="self-end text-[10px] text-muted-foreground animate-pulse">
                                Typing...
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Bar Simulation */}
                <div className="p-3 bg-background border-t mt-auto">
                    <div className="rounded-full bg-muted h-8 px-3 flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px]">iMessage</span>
                        <div className="h-4 w-4 rounded-full bg-blue-500/20"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
