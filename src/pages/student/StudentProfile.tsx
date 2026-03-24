import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle } from "lucide-react";

export default function StudentProfile() {
  const { profile } = useAuth();

  const fields = [
    { label: "Name", value: profile?.name },
    { label: "Username", value: profile?.username },
    { label: "Year", value: profile?.year },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold"><UserCircle className="w-6 h-6 inline mr-2" />My Profile</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-primary-foreground">
                  {profile?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">{profile?.name}</h2>
                <p className="text-muted-foreground font-mono text-sm">{profile?.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(f => f.value && (
                <div key={f.label} className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</p>
                  <p className="font-medium">{f.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
