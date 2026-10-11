
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function OnboardingPage() {
    const router = useRouter();

    const [accountName, setAccountName] = useState("");
    const [accountType, setAccountType] = useState<"CASH" | "BANK" | "OTHER">("CASH");
    const [openingBalance, setOpeningBalance] = useState("0");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const balance = Number(openingBalance);

        if (!accountName.trim()) {
            toast.error("Account name is required");
            return;
        }

        if (!Number.isFinite(balance) || balance < 0) {
            toast.error("Enter a valid opening balance");
            return;
        }

        setIsLoading(true);

        try {
            const res = await axios.post("/api/onboarding", {
                accountName,
                accountType,
                openingBalance: balance,
            });

            toast.success(res.data.msg || "Onboarding completed successfully");
            router.replace("/dashboard");
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.msg || "Something went wrong. Please try again.",
                );

                if (error.response?.status === 401) {
                    router.replace("/login");
                }
            } else {
                toast.error("An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        Set up your first account
                    </CardTitle>
                    <CardDescription>
                        Add a cash, bank, or other account to start tracking your finances.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="accountName">Account name</Label>
                            <Input
                                id="accountName"
                                placeholder="e.g. Savings Account"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Account type</Label>

                            <Select
                                value={accountType}
                                onValueChange={(value) => setAccountType(value as "CASH" | "BANK" | "OTHER")}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select account type" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="BANK">Bank account</SelectItem>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="openingBalance">Opening balance</Label>
                            <Input
                                id="openingBalance"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                required
                            />
                            <p className="text-sm text-muted-foreground">
                                Enter the money currently available in this account.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? "Setting up account..." : "Complete setup"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}