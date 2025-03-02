import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, deleteUser, getAuth } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import StudentForm from "@/components/student-form";
import { type Student, studentSchema } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Pencil, Trash2 } from "lucide-react";

export default function AdminStudents() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocation("/");
      return;
    }

    const fetchStudents = async () => {
      try {
        const studentsRef = collection(db, collections.students);
        const q = query(studentsRef, orderBy("name"));
        const snapshot = await getDocs(q);

        const fetchedStudents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Student[];

        setStudents(fetchedStudents);

        // Extract unique branches
        const uniqueBranches = Array.from(new Set(fetchedStudents.map(s => s.branch))).filter(Boolean);
        setBranches(uniqueBranches);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Error fetching students",
          description: "Please try again later",
          variant: "destructive"
        });
      }
    };

    fetchStudents();
  }, [setLocation, toast]);

  const handleCreateStudent = async (data: Student) => {
    setLoading(true);
    try {
      // Validate data
      studentSchema.parse(data);

      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.username,
        data.password
      );

      // Store additional data
      const studentRef = collection(db, collections.students);
      await addDoc(studentRef, {
        ...data,
        role: "student",
        createdAt: new Date(),
        authUid: userCredential.user.uid
      });

      toast({
        title: "Student created successfully"
      });

      // Refresh students list and close dialog
      const studentsRef = collection(db, collections.students);
      const q = query(studentsRef, orderBy("name"));
      const snapshot = await getDocs(q);
      setStudents(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Student[]
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("Error creating student:", error);
      toast({
        title: "Error creating student",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudent = async (data: Student) => {
    if (!editingStudent?.id) return;

    setLoading(true);
    try {
      // Validate data
      studentSchema.parse(data);

      // Update student document
      const studentRef = doc(db, collections.students, editingStudent.id);
      await updateDoc(studentRef, {
        ...data,
        updatedAt: new Date()
      });

      toast({
        title: "Student updated successfully"
      });

      // Refresh students list and close dialog
      const studentsRef = collection(db, collections.students);
      const q = query(studentsRef, orderBy("name"));
      const snapshot = await getDocs(q);
      setStudents(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Student[]
      );
      setDialogOpen(false);
      setEditingStudent(null);
    } catch (error) {
      console.error("Error updating student:", error);
      toast({
        title: "Error updating student",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) return;

    try {
      if (!student.id || !student.authUid) return;

      // First, delete the user from Firebase Authentication
      const adminAuth = getAuth();
      await deleteUser(adminAuth, student.authUid);

      // Then delete from Firestore
      await deleteDoc(doc(db, collections.students, student.id));

      toast({
        title: "Student deleted successfully"
      });

      // Update local state
      setStudents(students.filter(s => s.id !== student.id));
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error deleting student",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    }
  };

  const filteredStudents = selectedBranch === "all"
    ? students
    : students.filter(student => student.branch === selectedBranch);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Students</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStudent(null)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Edit Student" : "Add New Student"}
              </DialogTitle>
            </DialogHeader>
            <StudentForm 
              onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent} 
              loading={loading}
              defaultValues={editingStudent || undefined}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Students</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredStudents.map((student) => (
          <Card key={student.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{student.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => handleEdit(student)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDeleteStudent(student)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Roll Number</dt>
                  <dd>{student.rollNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Branch</dt>
                  <dd>{student.branch}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Year</dt>
                  <dd>Year {student.year}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Batch</dt>
                  <dd>{student.batch}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}