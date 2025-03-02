import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { type Student, type Subject, type MidMarks } from "@shared/schema";

export default function StudentResults() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedMid, setSelectedMid] = useState<string>("1");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<MidMarks[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocation("/");
      return;
    }

    const fetchData = async () => {
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

          // Set up real-time listener for subjects
          const subjectsRef = collection(db, "subjects");
          const subjectsQuery = query(
            subjectsRef,
            where("semester", "==", parseInt(selectedSemester)),
            where("branch", "==", studentData.branch)
          );

          const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
            const fetchedSubjects = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Subject[];
            setSubjects(fetchedSubjects);
          });

          // Set up real-time listener for marks
          const marksRef = collection(db, "midMarks");
          const marksQuery = query(
            marksRef,
            where("studentId", "==", studentDoc.id),
            where("semester", "==", parseInt(selectedSemester)),
            where("midNumber", "==", parseInt(selectedMid))
          );

          const unsubscribeMarks = onSnapshot(marksQuery, (snapshot) => {
            const fetchedMarks = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as MidMarks[];
            setMarks(fetchedMarks);
          });

          return () => {
            unsubscribeSubjects();
            unsubscribeMarks();
          };
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [setLocation, selectedSemester, selectedMid]);

  const getMarkForSubject = (subjectId: string) => {
    const mark = marks.find(m => m.subjectId === subjectId);
    return mark ? mark.marks : "-";
  };

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Results</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="https://jntuhresults.vercel.app/" target="_blank" rel="noopener noreferrer">
              JNTUH Results (Server 1)
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="http://results.jntuh.ac.in/results/" target="_blank" rel="noopener noreferrer">
              JNTUH Results (Server 2)
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mid Exam</label>
              <Select value={selectedMid} onValueChange={setSelectedMid}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mid exam" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Mid-1</SelectItem>
                  <SelectItem value="2">Mid-2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Semester {selectedSemester} - Mid {selectedMid} Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead className="text-right">Marks (Max: 30)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map(subject => (
                    <TableRow key={subject.id}>
                      <TableCell>{subject.code}</TableCell>
                      <TableCell>{subject.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {getMarkForSubject(subject.id)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No subjects found for the selected semester
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}