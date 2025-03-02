import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, UserPlus, GraduationCap } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAttendance: 0,
    branches: [] as string[]
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocation("/");
      return;
    }

    const fetchStats = async () => {
      try {
        // Get students collection
        const studentsRef = collection(db, collections.students);
        const studentsSnapshot = await getDocs(studentsRef);

        if (!studentsSnapshot.empty) {
          const students = studentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Student[];

          const branches = [...new Set(students.map(s => s.branch))];

          // Get today's attendance
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const attendanceRef = collection(db, collections.attendance);
          const attendanceQuery = query(
            attendanceRef,
            where("date", ">=", today)
          );
          const attendanceSnapshot = await getDocs(attendanceQuery);

          let totalPresent = 0;
          let totalRecords = 0;

          for (const doc of attendanceSnapshot.docs) {
            const recordsRef = collection(doc.ref, 'records');
            const recordsSnapshot = await getDocs(recordsRef);

            recordsSnapshot.docs.forEach(record => {
              totalRecords++;
              if (record.data().present) totalPresent++;
            });
          }

          const attendancePercentage = totalRecords > 0 
            ? (totalPresent / totalRecords) * 100 
            : 0;

          setStats({
            totalStudents: students.length,
            totalAttendance: Math.round(attendancePercentage),
            branches
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [setLocation]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Admin Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.branches.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendance}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/admin/students">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Student
              </Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/admin/attendance">
                <CalendarCheck className="mr-2 h-4 w-4" />
                Mark Attendance
              </Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/admin/mid-marks">
                <GraduationCap className="mr-2 h-4 w-4" />
                Manage Mid Marks
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branch Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.branches.map((branch) => (
                <div key={branch} className="flex justify-between items-center">
                  <span className="font-medium">{branch}</span>
                  <Button variant="ghost" asChild>
                    <Link href={`/admin/students?branch=${branch}`}>
                      View Students
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}