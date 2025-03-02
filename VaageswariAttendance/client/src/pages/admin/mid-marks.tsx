import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Trash2, Search } from "lucide-react";
import { type Student, type Subject, type MidMarks } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminMidMarks() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedMid, setSelectedMid] = useState<string>("1");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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
        const studentsSnapshot = await getDocs(studentsRef);

        const fetchedStudents = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Student[];

        setStudents(fetchedStudents);

        // Fetch subjects for selected semester and branch
        const subjectsRef = collection(db, "subjects");
        const subjectsQuery = query(
          subjectsRef,
          where("semester", "==", parseInt(selectedSemester)),
          where("branch", "==", selectedBranch === "all" ? null : selectedBranch)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);

        const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Subject[];

        setSubjects(fetchedSubjects);

        // If student is selected, fetch their marks
        if (selectedStudent) {
          const marksRef = collection(db, "midMarks");
          const marksQuery = query(
            marksRef,
            where("studentId", "==", selectedStudent.id),
            where("semester", "==", parseInt(selectedSemester)),
            where("midNumber", "==", parseInt(selectedMid))
          );
          const marksSnapshot = await getDocs(marksQuery);

          const marksData: Record<string, number> = {};
          marksSnapshot.docs.forEach(doc => {
            const data = doc.data();
            marksData[data.subjectId] = data.marks;
          });

          setMarks(marksData);
        }
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
  }, [setLocation, toast, selectedSemester, selectedMid, selectedBranch, selectedStudent]);

  const handleAddSubject = async () => {
    if (!newSubject.name || !newSubject.code) {
      toast({
        title: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const subjectsRef = collection(db, "subjects");
      const subjectDoc = await addDoc(subjectsRef, {
        ...newSubject,
        semester: parseInt(selectedSemester),
        branch: selectedBranch === "all" ? null : selectedBranch
      });

      // Add to local state
      setSubjects(prev => [...prev, {
        id: subjectDoc.id,
        name: newSubject.name,
        code: newSubject.code,
        semester: parseInt(selectedSemester),
        branch: selectedBranch === "all" ? null : selectedBranch
      }]);

      setNewSubject({ name: "", code: "" });
      toast({ title: "Subject added successfully" });
    } catch (error) {
      toast({
        title: "Error adding subject",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    setDeleteSubjectId(subjectId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteSubjectId) return;

    try {
      const subjectRef = doc(db, "subjects", deleteSubjectId);
      await deleteDoc(subjectRef);

      // Remove from local state
      setSubjects(prev => prev.filter(s => s.id !== deleteSubjectId));
      setMarks(prev => {
        const newMarks = { ...prev };
        delete newMarks[deleteSubjectId];
        return newMarks;
      });

      toast({ title: "Subject deleted successfully" });
    } catch (error) {
      toast({
        title: "Error deleting subject",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
      setDeleteSubjectId(null);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedStudent) {
      toast({
        title: "Please select a student first",
        variant: "destructive"
      });
      return;
    }
    setShowUpdateDialog(true);
  };

  const confirmSaveMarks = async () => {
    if (!selectedStudent) return;

    setLoading(true);
    try {
      const marksRef = collection(db, "midMarks");

      // Save marks for each subject
      await Promise.all(
        subjects.map(async (subject) => {
          const mark = marks[subject.id] || 0;

          const marksQuery = query(
            marksRef,
            where("studentId", "==", selectedStudent.id),
            where("subjectId", "==", subject.id),
            where("semester", "==", parseInt(selectedSemester)),
            where("midNumber", "==", parseInt(selectedMid))
          );
          const snapshot = await getDocs(marksQuery);

          if (!snapshot.empty) {
            // Update existing marks
            await updateDoc(doc(marksRef, snapshot.docs[0].id), {
              marks: mark,
              updatedAt: new Date()
            });
          } else {
            // Create new marks entry
            await addDoc(marksRef, {
              studentId: selectedStudent.id,
              subjectId: subject.id,
              semester: parseInt(selectedSemester),
              midNumber: parseInt(selectedMid),
              marks: mark,
              maxMarks: 30,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        })
      );

      toast({ title: "Marks saved successfully" });
    } catch (error) {
      toast({
        title: "Error saving marks",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowUpdateDialog(false);
    }
  };

  const handleMarkChange = (subjectId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setMarks(prev => ({
      ...prev,
      [subjectId]: Math.min(Math.max(numValue, 0), 30)
    }));
  };

  const filteredStudents = students.filter(student => {
    if (selectedBranch !== "all" && student.branch !== selectedBranch) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        student.name.toLowerCase().includes(query) ||
        student.rollNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Mid Marks Management</h2>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select value={selectedBranch} onValueChange={(value) => {
                setSelectedBranch(value);
                setSelectedStudent(null);
                setSubjects([]);
                setMarks({});
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {Array.from(new Set(students.map(s => s.branch))).map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={selectedSemester} onValueChange={(value) => {
                setSelectedSemester(value);
                setSelectedStudent(null);
                setSubjects([]);
                setMarks({});
              }}>
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
              <Select value={selectedMid} onValueChange={(value) => {
                setSelectedMid(value);
                setSelectedStudent(null);
                setMarks({});
              }}>
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

      {/* Student Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        <Button
                          variant={selectedStudent?.id === student.id ? "default" : "secondary"}
                          onClick={() => setSelectedStudent(student)}
                        >
                          {selectedStudent?.id === student.id ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Management and Marks Entry */}
      {selectedStudent && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Subject Name"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Subject Code"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, code: e.target.value }))}
                />
                <Button onClick={handleAddSubject}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Subject
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marks Entry for {selectedStudent.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject Name</TableHead>
                          <TableHead className="text-center">Marks (Max: 30)</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjects.map(subject => (
                          <TableRow key={subject.id}>
                            <TableCell>
                              {subject.name}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {subject.code}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min="0"
                                max="30"
                                value={marks[subject.id] || ""}
                                onChange={(e) => handleMarkChange(subject.id, e.target.value)}
                                className="w-20 mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSubject(subject.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveMarks} disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Marks
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No subjects added yet. Add subjects above to start entering marks.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Marks Preview */}
          {subjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Marks Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{subject.name}</h4>
                        <p className="text-sm text-muted-foreground">{subject.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Marks: {marks[subject.id] || "0"}/30</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Subject Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subject? This action cannot be undone,
              and all related marks will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Marks Dialog */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Marks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these marks? This will update any existing marks
              for {selectedStudent?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveMarks}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}