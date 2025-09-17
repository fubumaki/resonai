# AI Assistant Clone Implementation Guide

## 🎯 **How to Use This Prompt**

### **For Development Teams:**

#### **1. System Prompt Setup**
Copy the content from `docs/system-prompt-short.md` and use it as your AI assistant's system prompt. This establishes the AI's role, expertise, and working methodology.

#### **2. Project Context Initialization**
Before starting any work, provide the AI with:
```markdown
## Project Context
- **Repository:** [Your Resonai repository URL]
- **Current Branch:** [Current development branch]
- **Recent Changes:** [List of recent commits or features]
- **Active Issues:** [Current bugs or feature requests]
- **Team Members:** [Who's working on what]
```

#### **3. Task Assignment Format**
When assigning tasks, use this structure:
```markdown
## Task: [Feature/Component Name]

### Objective
[Clear statement of what needs to be built]

### Requirements
- [ ] [Specific requirement 1]
- [ ] [Specific requirement 2]
- [ ] [Specific requirement 3]

### Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

### Context
[Any relevant background information]

### Constraints
[Any limitations or considerations]
```

---

## 🎯 **Prompt Customization**

### **For Different Project Types:**

#### **Audio Processing Projects:**
Add to the system prompt:
```markdown
## Audio Processing Specialization
- **Real-time Processing** - 60fps audio analysis and visualization
- **Web Audio API** - AudioContext, worklets, and performance optimization
- **Audio Worklets** - Custom processors for pitch, brightness, and energy analysis
- **Performance Monitoring** - CPU usage, memory management, and frame rate optimization
```

#### **Accessibility-Focused Projects:**
Add to the system prompt:
```markdown
## Accessibility Specialization
- **WCAG AA Compliance** - Full accessibility standard compliance
- **Screen Reader Support** - ARIA attributes and semantic HTML
- **Keyboard Navigation** - Complete keyboard accessibility
- **High Contrast** - Accessible color schemes and visual indicators
```

#### **Testing-Heavy Projects:**
Add to the system prompt:
```markdown
## Testing Specialization
- **Comprehensive Coverage** - Unit, integration, E2E, and accessibility testing
- **Test Automation** - Automated test generation and execution
- **Performance Testing** - Frame rate, CPU usage, and memory leak detection
- **Visual Regression** - UI consistency across browsers and devices
```

---

## 🎯 **Integration with Development Workflow**

### **1. Daily Development Routine**

#### **Morning Setup:**
```markdown
## Daily Context Update
- **Yesterday's Progress:** [What was completed]
- **Today's Goals:** [What needs to be done]
- **Current Blockers:** [Any issues or dependencies]
- **Team Updates:** [Changes from other team members]
```

#### **Task Execution:**
```markdown
## Task: [Feature Name]
Please implement [specific feature] following our established patterns:

1. **Analyze** the existing codebase for similar patterns
2. **Plan** the implementation with clear milestones
3. **Implement** with comprehensive testing
4. **Validate** against acceptance criteria
5. **Document** the implementation and decisions

**Quality Requirements:**
- TypeScript with strict typing
- Comprehensive test coverage
- WCAG AA accessibility compliance
- 60fps performance for real-time features
```

### **2. Code Review Process**

#### **Review Request Format:**
```markdown
## Code Review Request

### Changes Made
- [ ] [Feature 1] - [Brief description]
- [ ] [Feature 2] - [Brief description]
- [ ] [Tests] - [Test coverage added]

### Quality Checklist
- [ ] TypeScript compilation passes
- [ ] All tests pass (unit, E2E, accessibility)
- [ ] Performance requirements met (60fps, <5% CPU)
- [ ] Accessibility compliance verified
- [ ] Documentation updated

### Testing Performed
- [ ] Unit tests written and passing
- [ ] E2E tests covering user workflows
- [ ] Accessibility testing with screen readers
- [ ] Performance testing under load
- [ ] Cross-browser compatibility testing

### Deployment Readiness
- [ ] No breaking changes
- [ ] Backward compatibility maintained
- [ ] Analytics events properly tracked
- [ ] Error handling implemented
- [ ] Monitoring and alerting configured
```

---

## 🎯 **Advanced Usage Patterns**

### **1. Feature Development Workflow**

#### **Phase 1: Planning**
```markdown
## Feature Planning Session

**Feature:** [Feature Name]
**User Story:** As a [user type], I want [goal] so that [benefit]

**Technical Analysis:**
- [ ] Existing codebase review
- [ ] Architecture impact assessment
- [ ] Performance requirements analysis
- [ ] Accessibility considerations
- [ ] Testing strategy planning

**Implementation Plan:**
1. [Phase 1] - [Specific deliverables]
2. [Phase 2] - [Specific deliverables]
3. [Phase 3] - [Specific deliverables]

**Success Metrics:**
- [ ] [Quantifiable metric 1]
- [ ] [Quantifiable metric 2]
- [ ] [Quantifiable metric 3]
```

#### **Phase 2: Implementation**
```markdown
## Implementation Phase

**Current Phase:** [Phase Name]
**Deliverables:** [Specific components/features]

**Implementation Approach:**
- [ ] Component architecture design
- [ ] State management strategy
- [ ] Testing framework setup
- [ ] Performance optimization
- [ ] Accessibility implementation

**Quality Gates:**
- [ ] Code review completed
- [ ] Tests passing (unit, E2E, accessibility)
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Analytics integration complete
```

### **2. Debugging and Troubleshooting**

#### **Issue Investigation:**
```markdown
## Debugging Session

**Issue:** [Problem description]
**Symptoms:** [What users are experiencing]
**Environment:** [Browser, device, conditions]

**Investigation Steps:**
1. [ ] Reproduce the issue
2. [ ] Analyze error logs and metrics
3. [ ] Check recent changes and dependencies
4. [ ] Test in different environments
5. [ ] Identify root cause

**Resolution Plan:**
- [ ] [Step 1] - [Specific action]
- [ ] [Step 2] - [Specific action]
- [ ] [Step 3] - [Specific action]

**Prevention Measures:**
- [ ] [Prevention 1] - [How to avoid recurrence]
- [ ] [Prevention 2] - [How to avoid recurrence]
```

---

## 🎯 **Prompt Maintenance**

### **1. Regular Updates**

#### **Weekly Review:**
- **Update project context** with recent changes
- **Refine expertise areas** based on new requirements
- **Adjust quality standards** based on team feedback
- **Update success criteria** based on metrics

#### **Monthly Assessment:**
- **Evaluate prompt effectiveness** through team feedback
- **Identify gaps** in AI assistance capabilities
- **Update technical knowledge** with new technologies
- **Refine working methodology** based on experience

### **2. Team Feedback Integration**

#### **Feedback Collection:**
```markdown
## AI Assistant Feedback

**Date:** [Date]
**Team Member:** [Name]
**Task:** [What was worked on]

**What worked well:**
- [ ] [Positive aspect 1]
- [ ] [Positive aspect 2]
- [ ] [Positive aspect 3]

**Areas for improvement:**
- [ ] [Improvement area 1]
- [ ] [Improvement area 2]
- [ ] [Improvement area 3]

**Suggestions:**
- [ ] [Suggestion 1]
- [ ] [Suggestion 2]
- [ ] [Suggestion 3]
```

#### **Prompt Refinement:**
Based on feedback, update the system prompt to:
- **Add missing expertise areas**
- **Refine quality standards**
- **Improve communication style**
- **Update project-specific knowledge**

---

## 🎯 **Success Metrics**

### **Team Productivity:**
- **Development Velocity** - 50% faster feature development
- **Bug Reduction** - 70% fewer production issues
- **Code Quality** - 95% test coverage maintained
- **Deployment Success** - 95% successful deployments

### **AI Assistant Effectiveness:**
- **Task Completion Rate** - 90%+ tasks completed successfully
- **Quality Standards** - 95%+ adherence to established standards
- **Team Satisfaction** - 4.5+/5.0 rating from team members
- **Knowledge Transfer** - Effective onboarding of new team members

### **Project Outcomes:**
- **User Satisfaction** - 4.0+/5.0 rating from end users
- **Performance Metrics** - 60fps maintained, <5% CPU usage
- **Accessibility Compliance** - 100% WCAG AA compliance
- **Feature Adoption** - 70%+ user engagement with new features

---

## 🎯 **Getting Started**

### **Step 1: Setup**
1. Copy the system prompt from `docs/system-prompt-short.md`
2. Customize it for your specific project needs
3. Set up the AI assistant with the customized prompt

### **Step 2: Initial Context**
1. Provide comprehensive project context
2. Share existing codebase and architecture
3. Establish quality standards and success criteria

### **Step 3: First Tasks**
1. Start with small, well-defined tasks
2. Establish working patterns and communication
3. Gather feedback and refine the approach

### **Step 4: Scale Up**
1. Gradually increase task complexity
2. Expand AI assistance to more areas
3. Continuously improve based on results

**Remember:** The AI assistant is a tool to amplify your team's capabilities, not replace human judgment and creativity. Use it to handle routine tasks and technical implementation while focusing on strategic decisions and user experience design.
