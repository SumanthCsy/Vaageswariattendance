import { useState } from "react";
import { useLocation } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { School } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (role: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Check user role in Firestore
      const usersRef = collection(db, collections.users);
      const q = query(usersRef, where("authUid", "==", result.user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();

        if (userData.role === role) {
          toast({
            title: "Login successful",
            description: `Welcome back, ${userData.name}!`
          });
          setLocation(role === "student" ? "/student/dashboard" : "/admin/dashboard");
          return;
        }
      }

      // Also check students collection for student role
      if (role === "student") {
        const studentsRef = collection(db, collections.students);
        const studentQuery = query(studentsRef, where("authUid", "==", result.user.uid));
        const studentSnapshot = await getDocs(studentQuery);

        if (!studentSnapshot.empty) {
          const studentData = studentSnapshot.docs[0].data();
          toast({
            title: "Login successful",
            description: `Welcome back, ${studentData.name}!`
          });
          setLocation("/student/dashboard");
          return;
        }
      }

      throw new Error(`User does not have ${role} privileges`);

    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "Invalid credentials or unauthorized access";
      if (error.code === "auth/user-not-found") {
        errorMessage = "User not found. Please check your ID.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid ID format.";
      }

      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });

      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50">
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <School className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Vaageswari College of Engineering</CardTitle>
            <p className="text-sm text-muted-foreground">Attendance Management System</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <form onSubmit={(e) => { e.preventDefault(); handleLogin("student"); }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student-email">Student ID</Label>
                      <Input
                        id="student-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Ex: 23s41a66g1@vgsek.ac.in"
                      />
                    </div>
                    <div>
                      <Label htmlFor="student-password">Password</Label>
                      <Input
                        id="student-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Logging in..." : "Login"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={(e) => { e.preventDefault(); handleLogin("admin"); }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin-email">Admin ID</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your admin ID"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Logging in..." : "Login"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}