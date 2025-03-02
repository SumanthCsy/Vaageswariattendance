import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth, db, collections } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ExternalLink, User, School, GraduationCap, Calendar } from "lucide-react";
import { type Student } from "@shared/schema";

export default function StudentProfile() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocation("/");
      return;
    }

    const fetchProfile = async () => {
      const studentsRef = collection(db, collections.students);
      const studentQuery = query(studentsRef, where("authUid", "==", user.uid));
      const snapshot = await getDocs(studentQuery);

      if (!snapshot.empty) {
        const studentDoc = snapshot.docs[0];
        setStudent({
          id: studentDoc.id,
          ...studentDoc.data()
        } as Student);
      }
    };

    fetchProfile();
  }, [setLocation]);

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Student Profile</h2>
        <Button variant="outline" asChild>
          <a href="https://forms.google.com/contact-admin" target="_blank" rel="noopener noreferrer">
            Contact Admin
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{student.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{student.rollNumber}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <School className="h-4 w-4" />
                Academic Information
              </h3>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Branch</dt>
                  <dd className="text-lg font-medium">{student.branch}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Current Year</dt>
                  <dd className="text-lg font-medium">Year {student.year}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Batch Information
              </h3>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Batch</dt>
                  <dd className="text-lg font-medium">{student.batch}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Student ID</dt>
                  <dd className="text-lg font-medium">{student.username}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Account Information
              </h3>
              <Separator className="my-2" />
              <p className="text-sm text-muted-foreground mt-3">
                To update your profile information or reset your password, please contact the administrator
                using the contact form above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}