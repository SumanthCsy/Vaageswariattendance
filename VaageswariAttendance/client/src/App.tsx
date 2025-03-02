import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import StudentDashboard from "@/pages/student/dashboard";
import StudentProfile from "@/pages/student/profile";
import StudentResults from "@/pages/student/results";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminAttendance from "@/pages/admin/attendance";
import AdminMidMarks from "@/pages/admin/mid-marks";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/student/dashboard" component={StudentDashboard} />
        <Route path="/student/profile" component={StudentProfile} />
        <Route path="/student/results" component={StudentResults} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/students" component={AdminStudents} />
        <Route path="/admin/attendance" component={AdminAttendance} />
        <Route path="/admin/mid-marks" component={AdminMidMarks} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;