import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Clock, CheckCircle2, Plus } from "lucide-react";

const tasks = [
  {
    id: 1,
    title: "Fix leaking faucet",
    property: "Harbor View #7",
    priority: "High",
    status: "In Progress",
    dueDate: "Jun 5, 2025",
    assignee: "Mike Torres",
    completed: false
  },
  {
    id: 2,
    title: "Annual HVAC maintenance",
    property: "Sunset Villa #12",
    priority: "Medium",
    status: "Scheduled",
    dueDate: "Jun 8, 2025",
    assignee: "HVAC Pro Services",
    completed: false
  },
  {
    id: 3,
    title: "Paint exterior walls",
    property: "Garden Court #23",
    priority: "Low",
    status: "Pending",
    dueDate: "Jun 15, 2025",
    assignee: "Perfect Paint Co",
    completed: false
  },
  {
    id: 4,
    title: "Replace broken window",
    property: "Riverside Studio #18",
    priority: "High",
    status: "In Progress",
    dueDate: "Jun 4, 2025",
    assignee: "Glass Masters",
    completed: false
  },
  {
    id: 5,
    title: "Deep cleaning",
    property: "Downtown Loft #5",
    priority: "Medium",
    status: "Completed",
    dueDate: "Jun 1, 2025",
    assignee: "Clean Pro",
    completed: true
  },
  {
    id: 6,
    title: "Inspect fire alarms",
    property: "Parkside #15",
    priority: "High",
    status: "Scheduled",
    dueDate: "Jun 6, 2025",
    assignee: "Safety First Inc",
    completed: false
  },
];

const Tasks = () => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "Low":
        return "bg-info/10 text-info border-info/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-accent/10 text-accent border-accent/20";
      case "In Progress":
        return "bg-primary/10 text-primary border-primary/20";
      case "Scheduled":
        return "bg-secondary/10 text-secondary border-secondary/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="h-5 w-5" />;
      case "In Progress":
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
            Maintenance Tasks
          </h1>
          <p className="text-muted-foreground">Track and manage property maintenance and repairs</p>
        </div>
        <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="p-6 gradient-card border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <p className="text-3xl font-bold text-foreground mt-1">{tasks.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 gradient-card border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <p className="text-3xl font-bold text-primary mt-1">
                {tasks.filter(t => t.status === "In Progress").length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 gradient-card border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold text-accent mt-1">
                {tasks.filter(t => t.completed).length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-success flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 gradient-card border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">High Priority</p>
              <p className="text-3xl font-bold text-destructive mt-1">
                {tasks.filter(t => t.priority === "High" && !t.completed).length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-destructive to-secondary flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tasks List */}
      <Card className="p-6 gradient-card border-0 shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-foreground">All Tasks</h3>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className={`flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all ${
                task.completed ? "opacity-60" : ""
              }`}
            >
              <Checkbox 
                checked={task.completed}
                className="h-5 w-5"
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className={`font-semibold text-foreground ${task.completed ? "line-through" : ""}`}>
                    {task.title}
                  </h4>
                  <Badge className={`${getPriorityColor(task.priority)} border`}>
                    {task.priority}
                  </Badge>
                  <Badge className={`${getStatusColor(task.status)} border`}>
                    {task.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getStatusIcon(task.status)}
                    {task.property}
                  </span>
                  <span>Due: {task.dueDate}</span>
                  <span>Assigned to: {task.assignee}</span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/10">
                View Details
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Tasks;
