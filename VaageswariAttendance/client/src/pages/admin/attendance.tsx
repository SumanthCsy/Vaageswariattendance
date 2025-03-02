import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import AttendanceForm from "@/components/attendance-form";
import { type Student } from "@shared/schema";
import { format } from "date-fns";

export default function AdminAttendance() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, present: 0 });
  const [directPercentage, setDirectPercentage] = useState<string>("");
  const [existingAttendance, setExistingAttendance] = useState<any>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocation("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch students
        const studentsRef = collection(db, collections.students);
        const q = query(studentsRef, orderBy("name"));
        const snapshot = await getDocs(q);

        const fetchedStudents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Student[];

        setStudents(fetchedStudents);

        // Extract unique branches
        const uniqueBranches = Array.from(new Set(fetchedStudents.map(s => s.branch)));
        setBranches(uniqueBranches);

        // Check for existing attendance on selected date
        const attendanceRef = collection(db, collections.attendance);
        const attendanceQuery = query(
          attendanceRef,
          where("date", "==", format(selectedDate, "yyyy-MM-dd"))
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);

        if (!attendanceSnapshot.empty) {
          const attendanceDoc = attendanceSnapshot.docs[0];
          const recordsRef = collection(attendanceDoc.ref, 'records');
          const recordsSnapshot = await getDocs(recordsRef);

          const records = recordsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setExistingAttendance({
            id: attendanceDoc.id,
            ...attendanceDoc.data(),
            records
          });
        } else {
          setExistingAttendance(null);
        }

        // Fetch today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayQuery = query(
          attendanceRef,
          where("date", "==", format(today, "yyyy-MM-dd"))
        );
        const todaySnapshot = await getDocs(todayQuery);

        let totalStudents = 0;
        let presentStudents = 0;

        for (const doc of todaySnapshot.docs) {
          const recordsRef = collection(doc.ref, 'records');
          const recordsSnapshot = await getDocs(recordsRef);

          recordsSnapshot.docs.forEach(record => {
            totalStudents++;
            if (record.data().present) presentStudents++;
          });
        }

        setTodayStats({
          total: totalStudents,
          present: presentStudents
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error fetching data",
          description: "Please try again later",
          variant: "destructive"
        });
      }
    };

    fetchData();
  }, [setLocation, toast, selectedDate]);

  const handleUpdateAttendance = async (data: any) => {
    if (!existingAttendance) return;

    setLoading(true);
    try {
      const attendanceRef = doc(db, collections.attendance, existingAttendance.id);
      await updateDoc(attendanceRef, {
        branch: selectedBranch === "all" ? null : selectedBranch,
        year: selectedYear === "all" ? null : parseInt(selectedYear),
        semester: selectedSemester === "all" ? null : parseInt(selectedSemester),
        updatedAt: new Date()
      });

      // Update records
      const recordsRef = collection(attendanceRef, 'records');
      await Promise.all(
        data.students.map(async (student: any) => {
          const existingRecord = existingAttendance.records.find(
            (r: any) => r.studentId === student.id
          );

          if (existingRecord) {
            const recordRef = doc(recordsRef, existingRecord.id);
            await updateDoc(recordRef, {
              present: student.present,
              updatedAt: new Date()
            });
          } else {
            await addDoc(recordsRef, {
              studentId: student.id,
              present: student.present,
              timestamp: new Date()
            });
          }
        })
      );

      toast({
        title: "Attendance updated successfully"
      });

      // Refresh the page data
      const newSnapshot = await getDocs(recordsRef);
      setExistingAttendance({
        ...existingAttendance,
        records: newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      });
    } catch (error) {
      toast({
        title: "Error updating attendance",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const attendanceRef = collection(db, collections.attendance);
      const todayStr = format(selectedDate, "yyyy-MM-dd");

      // Create main attendance document
      const attendanceDoc = await addDoc(attendanceRef, {
        date: todayStr,
        branch: selectedBranch === "all" ? null : selectedBranch,
        year: selectedYear === "all" ? null : parseInt(selectedYear),
        semester: selectedSemester === "all" ? null : parseInt(selectedSemester),
        createdAt: new Date()
      });

      // Create individual records for each student
      const recordsRef = collection(attendanceDoc, 'records');
      await Promise.all(
        data.students.map((student: any) =>
          addDoc(recordsRef, {
            studentId: student.id,
            present: student.present,
            timestamp: new Date()
          })
        )
      );

      toast({
        title: "Attendance marked successfully"
      });

      // Update today's stats if marking for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate.getTime() === today.getTime()) {
        setTodayStats(prev => ({
          total: data.students.length,
          present: data.students.filter((s: any) => s.present).length
        }));
      }

      // Refresh attendance data
      const attendanceQuery = query(
        attendanceRef,
        where("date", "==", todayStr)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      if (!attendanceSnapshot.empty) {
        const doc = attendanceSnapshot.docs[0];
        const records = await getDocs(collection(doc.ref, 'records'));
        setExistingAttendance({
          id: doc.id,
          ...doc.data(),
          records: records.docs.map(r => ({ id: r.id, ...r.data() }))
        });
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error marking attendance",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPercentage = async () => {
    if (!selectedBranch || !selectedYear || !directPercentage) {
      toast({
        title: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    const percentage = parseFloat(directPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: "Invalid percentage",
        description: "Please enter a number between 0 and 100",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const attendanceRef = collection(db, collections.attendance);

      const attendanceDoc = await addDoc(attendanceRef, {
        date: format(selectedDate, "yyyy-MM-dd"),
        branch: selectedBranch === "all" ? null : selectedBranch,
        year: selectedYear === "all" ? null : parseInt(selectedYear),
        semester: selectedSemester === "all" ? null : parseInt(selectedSemester),
        percentage: percentage,
        isDirectEntry: true,
        createdAt: new Date()
      });

      const recordsRef = collection(attendanceDoc, 'records');
      const studentsToMark = filteredStudents.slice(0, Math.round(filteredStudents.length * (percentage / 100)));

      await Promise.all(
        studentsToMark.map(student =>
          addDoc(recordsRef, {
            studentId: student.id,
            present: true,
            timestamp: new Date()
          })
        )
      );

      const remainingStudents = filteredStudents.slice(Math.round(filteredStudents.length * (percentage / 100)));
      await Promise.all(
        remainingStudents.map(student =>
          addDoc(recordsRef, {
            studentId: student.id,
            present: false,
            timestamp: new Date()
          })
        )
      );

      toast({
        title: "Attendance marked successfully"
      });

      const today = new Date();
      if (selectedDate.getTime() === today.setHours(0, 0, 0, 0)) {
        setTodayStats(prev => ({
          total: filteredStudents.length,
          present: Math.round(filteredStudents.length * (percentage / 100))
        }));
      }

      setDirectPercentage("");
    } catch (error) {
      toast({
        title: "Error marking attendance",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    if (selectedBranch !== "all" && student.branch !== selectedBranch) return false;
    if (selectedYear !== "all" && student.year !== parseInt(selectedYear)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Mark Attendance</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Total Students</dt>
                <dd className="text-2xl font-bold">{todayStats.total}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Present</dt>
                <dd className="text-2xl font-bold text-green-600">
                  {todayStats.total > 0
                    ? `${((todayStats.present / todayStats.total) * 100).toFixed(1)}%`
                    : "0%"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select onValueChange={setSelectedBranch} value={selectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select onValueChange={setSelectedYear} value={selectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {[1, 2, 3, 4].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select onValueChange={setSelectedSemester} value={selectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                    <SelectItem key={semester} value={semester.toString()}>
                      Semester {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Percentage Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Enter attendance percentage"
                value={directPercentage}
                onChange={(e) => setDirectPercentage(e.target.value)}
                className="w-full"
              />
              <Button
                onClick={handleDirectPercentage}
                disabled={loading || !directPercentage}
              >
                Mark Attendance
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a percentage to automatically mark attendance for all students in the selected branch and year.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {existingAttendance
              ? `Edit Attendance for ${format(selectedDate, "PP")}`
              : `Mark Attendance for ${format(selectedDate, "PP")}`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceForm
            students={filteredStudents}
            onSubmit={existingAttendance ? handleUpdateAttendance : handleSubmit}
            loading={loading}
            defaultValues={existingAttendance?.records}
          />
        </CardContent>
      </Card>
    </div>
  );
}