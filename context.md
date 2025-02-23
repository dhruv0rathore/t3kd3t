# App Blueprint Context File

## 1. Project Breakdown

### App Name
**T3KDET**

### Platform
Web

### App Summary
T3KDET is a cutting-edge web application designed to help developers and teams quantify and manage technical debt in their codebases. By integrating with static analysis tools like ESLint and SonarQube, the app automatically computes key metrics such as cyclomatic complexity, bug density, and dependency risks. It then calculates a Technical Debt Score (TDS) using a customizable mathematical model. The app also offers CI/CD integration, historical trend analysis, predictive analytics, and actionable refactoring recommendations. The frontend is designed to be visually stunning and highly interactive, providing an engaging user experience that inspires UI/UX developers.

### Primary Use Case
The primary use case of T3KDET is to assist development teams and individual developers in identifying, quantifying, and managing technical debt in their codebases. It serves as a productivity tool that integrates with existing development workflows to provide actionable insights and recommendations.

### Authentication Requirements
- **User Accounts:** Yes, users need to create accounts to access the full features of the app.
- **Guest Users:** No, guest access is not supported.
- **Social Login Options:** Yes, users can log in using Google, GitHub, and other social providers via Supabase.
- **User Roles:** Basic user roles include Admin and General Users. Admins can manage integrations and settings, while General Users can view and interact with their technical debt data.

### Tech Stack Overview
| Category       | Web (Next.js)                                  |
|---------------|------------------------------------------------|
| **Frontend**  | React + Next.js                               |
| **UI Library** | Tailwind CSS + ShadCN                         |
| **Backend (BaaS)** | Supabase (data storage, real-time features) |
| **Deployment** | Vercel                                        |

## 2. Core Features

### Automated Code Analysis
- Integrate with static analysis tools (e.g., ESLint, SonarQube, CodeQL) to compute complexity, bug density, and dependency risks.
- Calculate a Technical Debt Score (TDS) using a customizable mathematical model.

### CI/CD Integration & Automated Triggering
- Automatically trigger analysis on every commit or pull request via CI/CD pipelines (e.g., GitHub Actions, Jenkins).
- Provide real-time feedback and notifications (via email or Slack).

### Historical Trend & Predictive Analytics
- Log analysis results over time and display interactive visualizations (line graphs, heat maps) showing trends in technical debt.
- Use predictive models to forecast future debt accrual.

### Issue Tracker & Project Management Integration
- Integrate with tools like Jira, Trello, or Asana to automatically create/update tasks for high-priority debt items.

### Actionable Playbooks/Refactoring Recommendations
- Generate standardized refactoring recommendations and “playbooks” that map common debt patterns to best practices and actionable steps.

## 3. User Flow

1. **Landing Page:**
   - Users land on a visually stunning landing page with a short welcome message and options to log in or sign up.
   
2. **Authentication:**
   - Users log in or sign up using Supabase authentication. Social login options are available.

3. **Homepage:**
   - After authentication, the homepage unblurs and displays a highly interactive and scrollable interface.
   - The homepage highlights the core features of the app in an engaging and visually appealing manner.

4. **Dashboard:**
   - Users will be given two options, 1st to manually add their project in the zip file or 2nd to let them get their project from github after authenticating their account.
   - Users will have to wait for a wait until the project is being analyzed by the AI and is being worked on to calculate the Technical Debt Score (TDS). A good loading screen with a progress bar should be implemented.
   - Users will then be directed to a dashboard where they can view their Technical Debt Score (TDS), recent analysis results, and key metrics.
   - Interactive visualizations (line graphs, heat maps) show historical trends and predictive analytics.

5. **Integration Settings:**
   - Users can configure integrations with static analysis tools, CI/CD pipelines, and project management tools.

6. **Refactoring Recommendations:**
   - Users can view and implement actionable refactoring recommendations and playbooks.

## 4. Design and UI/UX

### Visual Design
- **Color Scheme:** Use a modern, tech-inspired color palette with shades of blue, gray, and neon accents.
- **Typography:** Clean, sans-serif fonts for readability and a modern look.
- **Animations:** Subtle animations and transitions to enhance interactivity without overwhelming the user.

### User Experience
- **Interactivity:** The homepage should be highly interactive, with hover effects, scroll-triggered animations, and dynamic content loading.
- **Navigation:** Intuitive navigation with a sticky header and clear call-to-action buttons.
- **Responsiveness:** Ensure the design is fully responsive and works seamlessly across different screen sizes.

## 5. Technical Implementation

### Frontend
- **Framework:** Use Next.js for server-side rendering and static site generation.
- **UI Library:** Tailwind CSS for utility-first styling and ShadCN for pre-built, customizable components.
- **State Management:** Use React Context API or Zustand for state management.

### Backend
- **BaaS:** Supabase for authentication, data storage, and real-time features.
- **API Integration:** Use RESTful APIs or GraphQL to integrate with static analysis tools and CI/CD pipelines.

### Deployment
- **Platform:** Deploy the app on Vercel for seamless CI/CD and automatic deployments.

## 6. Workflow Links and Setup Instructions

### Tools and Resources
- **Frontend:** [Next.js Documentation](https://nextjs.org/docs), [Tailwind CSS Documentation](https://tailwindcss.com/docs), [ShadCN Documentation](https://shadcn.com/docs)
- **Backend:** [Supabase Documentation](https://supabase.io/docs)
- **Deployment:** [Vercel Documentation](https://vercel.com/docs)

### Setup Instructions
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-repo/tech-debt-calc.git
   cd tech-debt-calc
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Set Up Supabase:**
   - Create a new project on Supabase.
   - Configure authentication and database settings.
   - Add your Supabase credentials to the `.env` file.

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. **Deploy to Vercel:**
   - Push your code to a GitHub repository.
   - Connect the repository to Vercel and deploy.

This blueprint provides a comprehensive guide to kickstart the development of TechDebtCalc, ensuring a visually stunning and highly functional application.