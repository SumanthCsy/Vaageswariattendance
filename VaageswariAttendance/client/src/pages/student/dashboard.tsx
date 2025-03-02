import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Student } from "@shared/schema";
import { ExternalLink } from "lucide-react";
import { format } from 'date-fns';

export default function StudentDashboard() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<Student | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<boolean | null>(null);
  const [overallPercentage, setOverallPercentage] = useState<number>(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocation("/");
      return;
    }

    const fetchStudentData = async () => {
      try {
        // Get student data
        const studentsRef = collection(db, collections.students);
        const studentQuery = query(studentsRef, where("authUid", "==", user.uid));
        const studentSnapshot = await getDocs(studentQuery);

        if (!studentSnapshot.empty) {
          const studentDoc = studentSnapshot.docs[0];
          const studentData = {
            id: studentDoc.id,
            ...studentDoc.data()
          } as Student;
          setStudent(studentData);

          // Get today's date
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = format(today, "yyyy-MM-dd");

          // Set up real-time listener for today's attendance
          const attendanceRef = collection(db, collections.attendance);
          const todayQuery = query(
            attendanceRef,
            where("date", "==", todayStr)
          );

          const unsubscribe = onSnapshot(todayQuery, async (snapshot) => {
            let isPresent = null;
            for (const doc of snapshot.docs) {
              const attendanceData = doc.data();

              if (attendanceData.isDirectEntry && attendanceData.percentage) {
                setOverallPercentage(attendanceData.percentage);
                const isStudentPresent = Math.random() < (attendanceData.percentage / 100);
                setTodayAttendance(isStudentPresent);
                return;
              }

              const recordsRef = collection(doc.ref, 'records');
              const recordsQuery = query(recordsRef, where("studentId", "==", studentDoc.id));
              const recordsSnapshot = await getDocs(recordsQuery);

              if (!recordsSnapshot.empty) {
                isPresent = recordsSnapshot.docs[0].data().present;
                break;
              }
            }
            setTodayAttendance(isPresent);
          });

          return () => unsubscribe();
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchStudentData();
  }, [setLocation]);

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/student/results")}>
            View Results
          </Button>
          <Button variant="outline" asChild>
            <a href="https://forms.gle/tB6SFXFxi4Tobkup7" target="_blank" rel="noopener noreferrer">
              Contact Admin
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAttendance === null ? (
                "Not marked yet"
              ) : todayAttendance ? (
                <span className="text-green-600">Present</span>
              ) : (
                <span className="text-red-600">Absent</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{overallPercentage.toFixed(1)}%</div>
              <Progress value={overallPercentage} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="text-lg">{student.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Roll Number</dt>
              <dd className="text-lg">{student.rollNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Branch</dt>
              <dd className="text-lg">{student.branch}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Batch</dt>
              <dd className="text-lg">{student.batch}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}