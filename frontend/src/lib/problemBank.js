// ─── PrimeLearn Problem Bank ─────────────────────────────────────────────────────
// Real LeetCode/HackerRank-style problems with starters for Python, C++, C, Java.
// Returns 5 problems per topic: 2 Easy, 2 Medium, 1 Hard.
// ─────────────────────────────────────────────────────────────────────────────────

function s(py, cpp, c, java) { return { python: py, cpp, c, java }; }

const PROBLEMS = [
  // ═══════════ EASY ═══════════

  { id: 'e01', title: 'Two Sum', difficulty: 'Easy',
    tags: ['array', 'hash table', 'searching', 'dsa', 'placement'],
    description: 'Given an array of integers <code>nums</code> and an integer <code>target</code>, return the <b>indices</b> of the two numbers that add up to <code>target</code>. Each input has <b>exactly one solution</b>.',
    input_format: 'First line: N (size)\nSecond line: N integers\nThird line: target',
    output_format: 'Two space-separated indices (0-indexed)',
    sample_input: '4\n2 7 11 15\n9', sample_output: '0 1',
    explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
    starters: s(
      'def two_sum(nums, target):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nn = int(input())\nnums = list(map(int, input().split()))\nt = int(input())\nr = two_sum(nums, t)\nprint(r[0], r[1])',
      '#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\npair<int,int> twoSum(vector<int>& nums, int target) {\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return {-1,-1};\n}\n\nint main(){\n    int n; cin>>n;\n    vector<int> a(n);\n    for(int i=0;i<n;i++) cin>>a[i];\n    int t; cin>>t;\n    auto [x,y]=twoSum(a,t);\n    cout<<x<<" "<<y<<endl;\n}',
      '#include <stdio.h>\nvoid twoSum(int a[], int n, int t, int r[2]){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    r[0]=-1; r[1]=-1;\n}\nint main(){\n    int n; scanf("%d",&n);\n    int a[n]; for(int i=0;i<n;i++) scanf("%d",&a[i]);\n    int t; scanf("%d",&t);\n    int r[2]; twoSum(a,n,t,r);\n    printf("%d %d\\n",r[0],r[1]);\n}',
      'import java.util.*;\npublic class Main {\n    static int[] twoSum(int[] nums, int target) {\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return new int[]{-1,-1};\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for(int i=0;i<n;i++) a[i]=sc.nextInt();\n        int t = sc.nextInt();\n        int[] r = twoSum(a,t);\n        System.out.println(r[0]+" "+r[1]);\n    }\n}',
    ),
  },
  { id: 'e02', title: 'Reverse String', difficulty: 'Easy',
    tags: ['string', 'basics', 'dsa'],
    description: 'Write a function that reverses a given string.',
    input_format: 'A single string', output_format: 'Reversed string',
    sample_input: 'hello', sample_output: 'olleh', explanation: 'Reverse each character.',
    starters: s(
      'def solve(s):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nprint(solve(input()))',
      '#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main(){\n    string s; getline(cin,s);\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    cout<<s<<endl;\n}',
      '#include <stdio.h>\n#include <string.h>\nint main(){\n    char s[1001]; fgets(s,1001,stdin); s[strcspn(s,"\\n")]=0;\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    printf("%s\\n",s);\n}',
      'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        String s = new Scanner(System.in).nextLine();\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n    }\n}',
    ),
  },
  { id: 'e03', title: 'Valid Parentheses', difficulty: 'Easy',
    tags: ['string', 'stack', 'data structure', 'dsa'],
    description: 'Given a string containing <code>()</code>, <code>{}</code>, <code>[]</code>, determine if it is valid. Open brackets must be closed by the same type in the correct order.',
    input_format: 'A single string of brackets', output_format: '"true" or "false"',
    sample_input: '{[()]}', sample_output: 'true', explanation: 'All brackets match.',
    starters: s(
      'def is_valid(s):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nprint("true" if is_valid(input().strip()) else "false")',
      '#include <iostream>\n#include <stack>\n#include <string>\nusing namespace std;\nbool isValid(string s){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return false;\n}\nint main(){ string s; cin>>s; cout<<(isValid(s)?"true":"false")<<endl; }',
      '#include <stdio.h>\n#include <string.h>\nint isValid(char s[]){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){ char s[1001]; scanf("%s",s); printf("%s\\n",isValid(s)?"true":"false"); }',
      'import java.util.*;\npublic class Main {\n    static boolean isValid(String s){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return false;\n    }\n    public static void main(String[] a){ System.out.println(isValid(new Scanner(System.in).next())?"true":"false"); }\n}',
    ),
  },
  { id: 'e04', title: 'FizzBuzz', difficulty: 'Easy',
    tags: ['basics', 'loops', 'implementation', 'dsa'],
    description: 'Print 1 to N. For multiples of 3 → <b>Fizz</b>, 5 → <b>Buzz</b>, both → <b>FizzBuzz</b>.',
    input_format: 'A single integer N', output_format: 'N lines',
    sample_input: '5', sample_output: '1\n2\nFizz\n4\nBuzz',
    starters: s(
      'def fizzbuzz(n):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nfizzbuzz(int(input()))',
      '#include <iostream>\nusing namespace std;\nint main(){\n    int n; cin>>n;\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n}',
      '#include <stdio.h>\nint main(){\n    int n; scanf("%d",&n);\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n}',
      'import java.util.*;\npublic class Main {\n    public static void main(String[] args){\n        int n = new Scanner(System.in).nextInt();\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n    }\n}',
    ),
  },
  { id: 'e05', title: 'Fibonacci Number', difficulty: 'Easy',
    tags: ['recursion', 'dp', 'dynamic programming', 'math', 'mathematics', 'dsa'],
    description: 'Calculate <code>F(n)</code> where F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).',
    input_format: 'A single integer N (0 ≤ N ≤ 30)', output_format: 'F(N)',
    sample_input: '10', sample_output: '55', explanation: 'Sequence: 0,1,1,2,3,5,8,13,21,34,55',
    starters: s(
      'def fib(n):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nprint(fib(int(input())))',
      '#include <iostream>\nusing namespace std;\nint fib(int n){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return 0;\n}\nint main(){ int n; cin>>n; cout<<fib(n)<<endl; }',
      '#include <stdio.h>\nint fib(int n){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){ int n; scanf("%d",&n); printf("%d\\n",fib(n)); }',
      'import java.util.*;\npublic class Main {\n    static int fib(int n){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return 0;\n    }\n    public static void main(String[] a){ System.out.println(fib(new Scanner(System.in).nextInt())); }\n}',
    ),
  },
  { id: 'e06', title: 'Binary Search', difficulty: 'Easy',
    tags: ['array', 'binary search', 'searching', 'dsa'],
    description: 'Given a <b>sorted</b> array and target, return its index. If not found return <code>-1</code>. Must be O(log n).',
    input_format: 'First line: N\nSecond line: N sorted ints\nThird line: target',
    output_format: 'Index or -1',
    sample_input: '6\n-1 0 3 5 9 12\n9', sample_output: '4',
    starters: s(
      'def search(nums, t):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return -1\n\nn=int(input())\na=list(map(int,input().split()))\nt=int(input())\nprint(search(a,t))',
      '#include <iostream>\n#include <vector>\nusing namespace std;\nint search(vector<int>& a, int t){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return -1;\n}\nint main(){\n    int n; cin>>n; vector<int> a(n);\n    for(int i=0;i<n;i++) cin>>a[i];\n    int t; cin>>t; cout<<search(a,t)<<endl;\n}',
      '#include <stdio.h>\nint search(int a[], int n, int t){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return -1;\n}\nint main(){\n    int n; scanf("%d",&n); int a[n];\n    for(int i=0;i<n;i++) scanf("%d",&a[i]);\n    int t; scanf("%d",&t); printf("%d\\n",search(a,n,t));\n}',
      'import java.util.*;\npublic class Main {\n    static int search(int[] a, int t){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return -1;\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in); int n=sc.nextInt();\n        int[] a=new int[n]; for(int i=0;i<n;i++) a[i]=sc.nextInt();\n        System.out.println(search(a,sc.nextInt()));\n    }\n}',
    ),
  },
  { id: 'e07', title: 'Climbing Stairs', difficulty: 'Easy',
    tags: ['dp', 'dynamic programming', 'recursion', 'dsa', 'math'],
    description: 'You climb a staircase with <code>n</code> steps. Each time you can climb <b>1 or 2</b> steps. How many distinct ways to reach the top?',
    input_format: 'A single integer N', output_format: 'Number of ways',
    sample_input: '5', sample_output: '8',
    starters: s(
      'def climb(n):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nprint(climb(int(input())))',
      '#include <iostream>\nusing namespace std;\nint climb(int n){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return 0;\n}\nint main(){ int n; cin>>n; cout<<climb(n)<<endl; }',
      '#include <stdio.h>\nint climb(int n){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){ int n; scanf("%d",&n); printf("%d\\n",climb(n)); }',
      'import java.util.*;\npublic class Main {\n    static int climb(int n){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return 0;\n    }\n    public static void main(String[] a){ System.out.println(climb(new Scanner(System.in).nextInt())); }\n}',
    ),
  },
  { id: 'e08', title: 'Palindrome Check', difficulty: 'Easy',
    tags: ['string', 'two pointer', 'dsa'],
    description: 'Check if a string is a palindrome. Consider only alphanumeric characters, ignore case.',
    input_format: 'A single string', output_format: '"true" or "false"',
    sample_input: 'A man a plan a canal Panama', sample_output: 'true',
    starters: s(
      'def is_palindrome(s):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nprint("true" if is_palindrome(input()) else "false")',
      '#include <iostream>\n#include <string>\n#include <cctype>\nusing namespace std;\nbool isPalindrome(string s){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return false;\n}\nint main(){ string s; getline(cin,s); cout<<(isPalindrome(s)?"true":"false")<<endl; }',
      '#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\nint isPalin(char s[]){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){ char s[1001]; fgets(s,1001,stdin); s[strcspn(s,"\\n")]=0; printf("%s\\n",isPalin(s)?"true":"false"); }',
      'import java.util.*;\npublic class Main {\n    static boolean isPalin(String s){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return false;\n    }\n    public static void main(String[] a){ System.out.println(isPalin(new Scanner(System.in).nextLine())?"true":"false"); }\n}',
    ),
  },
  { id: 'e09', title: 'Bubble Sort', difficulty: 'Easy',
    tags: ['sorting', 'array', 'dsa'],
    description: 'Implement <b>Bubble Sort</b> to sort an array in ascending order.',
    input_format: 'First line: N\nSecond line: N integers', output_format: 'Sorted array',
    sample_input: '5\n64 34 25 12 22', sample_output: '12 22 25 34 64',
    starters: s(
      'def bubble_sort(a):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return a\n\nn=int(input())\na=list(map(int,input().split()))\nprint(" ".join(map(str,bubble_sort(a))))',
      '#include <iostream>\n#include <vector>\nusing namespace std;\nvoid bubbleSort(vector<int>& a){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n}\nint main(){\n    int n; cin>>n; vector<int> a(n);\n    for(int i=0;i<n;i++) cin>>a[i];\n    bubbleSort(a);\n    for(int i=0;i<n;i++) cout<<a[i]<<(i+1<n?" ":"\\n");\n}',
      '#include <stdio.h>\nvoid bubbleSort(int a[], int n){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n}\nint main(){\n    int n; scanf("%d",&n); int a[n];\n    for(int i=0;i<n;i++) scanf("%d",&a[i]);\n    bubbleSort(a,n);\n    for(int i=0;i<n;i++) printf("%d%c",a[i],i+1<n?\' \':\\\'\\n\\\');\n}',
      'import java.util.*;\npublic class Main {\n    static void bubbleSort(int[] a){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in); int n=sc.nextInt();\n        int[] a=new int[n]; for(int i=0;i<n;i++) a[i]=sc.nextInt();\n        bubbleSort(a);\n        StringBuilder sb=new StringBuilder();\n        for(int i=0;i<n;i++){if(i>0)sb.append(" ");sb.append(a[i]);}\n        System.out.println(sb);\n    }\n}',
    ),
  },
  { id: 'e10', title: 'Maximum Element in Array', difficulty: 'Easy',
    tags: ['array', 'basics', 'dsa'],
    description: 'Find the <b>maximum</b> element in an array.',
    input_format: 'First line: N\nSecond line: N integers', output_format: 'Maximum value',
    sample_input: '5\n3 1 4 1 5', sample_output: '5',
    starters: s(
      'def find_max(a):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    pass\n\nn=int(input())\na=list(map(int,input().split()))\nprint(find_max(a))',
      '#include <iostream>\n#include <vector>\nusing namespace std;\nint findMax(vector<int>& a){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return 0;\n}\nint main(){\n    int n; cin>>n; vector<int> a(n);\n    for(int i=0;i<n;i++) cin>>a[i];\n    cout<<findMax(a)<<endl;\n}',
      '#include <stdio.h>\nint findMax(int a[], int n){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){\n    int n; scanf("%d",&n); int a[n];\n    for(int i=0;i<n;i++) scanf("%d",&a[i]);\n    printf("%d\\n",findMax(a,n));\n}',
      'import java.util.*;\npublic class Main {\n    static int findMax(int[] a){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return 0;\n    }\n    public static void main(String[] a){\n        Scanner sc=new Scanner(System.in); int n=sc.nextInt();\n        int[] arr=new int[n]; for(int i=0;i<n;i++) arr[i]=sc.nextInt();\n        System.out.println(findMax(arr));\n    }\n}',
    ),
  },
  { id: 'e11', title: 'SQL: Select All Students', difficulty: 'Easy',
    tags: ['sql', 'database', 'select', 'basics'],
    description: 'Write a SQL query to select all students older than 18, ordered by name.',
    input_format: 'Students table with id, name, age, grade', output_format: 'Matching rows',
    sample_input: 'Students table', sample_output: 'Alice, Charlie, Eve (age > 18)',
    starters: s(
      '# Python with sqlite3\nimport sqlite3\nconn = sqlite3.connect(":memory:")\nc = conn.cursor()\nc.execute("CREATE TABLE Students (id INT, name TEXT, age INT, grade TEXT)")\nfor r in [(1,"Alice",20,"A"),(2,"Bob",17,"B"),(3,"Charlie",19,"A"),(4,"Diana",16,"C")]:\n    c.execute("INSERT INTO Students VALUES (?,?,?,?)", r)\n\n# ──── YOUR QUERY HERE ────\nquery = ""\n# ──── END ────\n\nfor row in c.execute(query):\n    print(row)',
      '#include <iostream>\nusing namespace std;\nint main(){\n    // SQL problem — use Python or SQL tab\n    // Query: SELECT * FROM Students WHERE age > 18 ORDER BY name;\n    cout << "Use Python or SQL for this problem" << endl;\n}',
      '#include <stdio.h>\nint main(){\n    printf("Use Python or SQL for this problem\\n");\n}',
      'public class Main {\n    public static void main(String[] a){\n        System.out.println("Use Python or SQL for this problem");\n    }\n}',
    ),
  },

  // ═══════════ MEDIUM ═══════════

  { id: 'm01', title: 'Maximum Subarray (Kadane\'s)', difficulty: 'Medium',
    tags: ['array', 'dp', 'dynamic programming', 'dsa'],
    description: 'Find the contiguous subarray with the <b>largest sum</b>.',
    input_format: 'First line: N\nSecond line: N integers', output_format: 'Maximum sum',
    sample_input: '9\n-2 1 -3 4 -1 2 1 -5 4', sample_output: '6',
    explanation: 'Subarray [4,-1,2,1] has sum 6.',
    starters: s(
      'def max_subarray(nums):\n    # ──── YOUR CODE HERE ────\n    # Hint: Kadane\'s algorithm\n    \n    # ──── END ────\n    pass\n\nn=int(input())\nnums=list(map(int,input().split()))\nprint(max_subarray(nums))',
      '#include <iostream>\n#include <vector>\n#include <climits>\nusing namespace std;\nint maxSubArray(vector<int>& a){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return 0;\n}\nint main(){\n    int n; cin>>n; vector<int> a(n);\n    for(int i=0;i<n;i++) cin>>a[i];\n    cout<<maxSubArray(a)<<endl;\n}',
      '#include <stdio.h>\n#include <limits.h>\nint maxSub(int a[], int n){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){\n    int n; scanf("%d",&n); int a[n];\n    for(int i=0;i<n;i++) scanf("%d",&a[i]);\n    printf("%d\\n",maxSub(a,n));\n}',
      'import java.util.*;\npublic class Main {\n    static int maxSub(int[] a){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return 0;\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in); int n=sc.nextInt();\n        int[] a=new int[n]; for(int i=0;i<n;i++) a[i]=sc.nextInt();\n        System.out.println(maxSub(a));\n    }\n}',
    ),
  },
  { id: 'm02', title: 'Merge Two Sorted Arrays', difficulty: 'Medium',
    tags: ['array', 'sorting', 'two pointer', 'merge sort', 'dsa'],
    description: 'Merge two sorted arrays into a single sorted array.',
    input_format: 'First line: N M\nSecond line: N sorted ints\nThird line: M sorted ints',
    output_format: 'Merged sorted array',
    sample_input: '3 3\n1 2 4\n1 3 5', sample_output: '1 1 2 3 4 5',
    starters: s(
      'def merge(a, b):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return []\n\nn,m=map(int,input().split())\na=list(map(int,input().split()))\nb=list(map(int,input().split()))\nprint(" ".join(map(str,merge(a,b))))',
      '#include <iostream>\n#include <vector>\nusing namespace std;\nvector<int> merge(vector<int>& a, vector<int>& b){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return {};\n}\nint main(){\n    int n,m; cin>>n>>m;\n    vector<int> a(n),b(m);\n    for(int i=0;i<n;i++) cin>>a[i];\n    for(int i=0;i<m;i++) cin>>b[i];\n    auto r=merge(a,b);\n    for(int i=0;i<(int)r.size();i++) cout<<r[i]<<(i+1<(int)r.size()?" ":"\\n");\n}',
      '#include <stdio.h>\nvoid merge(int a[],int n,int b[],int m,int r[]){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n}\nint main(){\n    int n,m; scanf("%d%d",&n,&m);\n    int a[n],b[m],r[n+m];\n    for(int i=0;i<n;i++) scanf("%d",&a[i]);\n    for(int i=0;i<m;i++) scanf("%d",&b[i]);\n    merge(a,n,b,m,r);\n    for(int i=0;i<n+m;i++) printf("%d%c",r[i],i+1<n+m?\' \':\\\'\\n\\\');\n}',
      'import java.util.*;\npublic class Main {\n    static int[] merge(int[] a, int[] b){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return new int[0];\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);\n        int n=sc.nextInt(),m=sc.nextInt();\n        int[] a=new int[n],b=new int[m];\n        for(int i=0;i<n;i++) a[i]=sc.nextInt();\n        for(int i=0;i<m;i++) b[i]=sc.nextInt();\n        int[] r=merge(a,b);\n        StringBuilder sb=new StringBuilder();\n        for(int i=0;i<r.length;i++){if(i>0)sb.append(" ");sb.append(r[i]);}\n        System.out.println(sb);\n    }\n}',
    ),
  },
  { id: 'm03', title: 'Linked List Cycle Detection', difficulty: 'Medium',
    tags: ['linked list', 'two pointer', 'data structure', 'dsa'],
    description: 'Detect if a linked list has a cycle using <b>Floyd\'s Tortoise and Hare</b>.',
    input_format: 'First: N nodes\nSecond: N values\nThird: pos (-1 if no cycle)',
    output_format: '"true" or "false"',
    sample_input: '4\n3 2 0 -4\n1', sample_output: 'true',
    explanation: 'Tail connects to node 1 creating cycle.',
    starters: s(
      'class Node:\n    def __init__(self,v): self.val=v; self.next=None\n\ndef has_cycle(head):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return False\n\nn=int(input())\nvals=list(map(int,input().split()))\npos=int(input())\nnodes=[Node(v) for v in vals]\nfor i in range(len(nodes)-1): nodes[i].next=nodes[i+1]\nif pos>=0: nodes[-1].next=nodes[pos]\nprint("true" if has_cycle(nodes[0] if nodes else None) else "false")',
      '#include <iostream>\nusing namespace std;\nstruct Node{int v;Node*next;Node(int x):v(x),next(nullptr){}};\nbool hasCycle(Node*h){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return false;\n}\nint main(){\n    int n;cin>>n;Node*a[n];\n    for(int i=0;i<n;i++){int v;cin>>v;a[i]=new Node(v);}\n    for(int i=0;i<n-1;i++)a[i]->next=a[i+1];\n    int p;cin>>p;if(p>=0)a[n-1]->next=a[p];\n    cout<<(hasCycle(a[0])?"true":"false")<<endl;\n}',
      '#include <stdio.h>\n#include <stdlib.h>\ntypedef struct N{int v;struct N*next;}N;\nint hasCycle(N*h){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){\n    int n;scanf("%d",&n);N*a[n];\n    for(int i=0;i<n;i++){int v;scanf("%d",&v);a[i]=malloc(sizeof(N));a[i]->v=v;a[i]->next=0;}\n    for(int i=0;i<n-1;i++)a[i]->next=a[i+1];\n    int p;scanf("%d",&p);if(p>=0)a[n-1]->next=a[p];\n    printf("%s\\n",hasCycle(a[0])?"true":"false");\n}',
      'import java.util.*;\npublic class Main {\n    static class Node{int v;Node next;Node(int x){v=x;}}\n    static boolean hasCycle(Node h){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return false;\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);int n=sc.nextInt();\n        Node[]a=new Node[n];for(int i=0;i<n;i++)a[i]=new Node(sc.nextInt());\n        for(int i=0;i<n-1;i++)a[i].next=a[i+1];\n        int p=sc.nextInt();if(p>=0)a[n-1].next=a[p];\n        System.out.println(hasCycle(a[0])?"true":"false");\n    }\n}',
    ),
  },
  { id: 'm04', title: 'Three Sum', difficulty: 'Medium',
    tags: ['array', 'two pointer', 'sorting', 'dsa', 'placement'],
    description: 'Find all unique triplets in the array that sum to zero. No duplicate triplets.',
    input_format: 'First line: N\nSecond line: N integers',
    output_format: 'Each triplet on a line, sorted',
    sample_input: '6\n-1 0 1 2 -1 -4', sample_output: '-1 -1 2\n-1 0 1',
    starters: s(
      'def three_sum(nums):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return []\n\nn=int(input())\nnums=list(map(int,input().split()))\nfor t in three_sum(nums):\n    print(" ".join(map(str,t)))',
      '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nvector<vector<int>> threeSum(vector<int>& a){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return {};\n}\nint main(){\n    int n;cin>>n;vector<int>a(n);\n    for(int i=0;i<n;i++)cin>>a[i];\n    auto r=threeSum(a);\n    for(auto&t:r) cout<<t[0]<<" "<<t[1]<<" "<<t[2]<<endl;\n}',
      '#include <stdio.h>\n#include <stdlib.h>\nint cmp(const void*a,const void*b){return *(int*)a-*(int*)b;}\nint main(){\n    int n;scanf("%d",&n);int a[n];\n    for(int i=0;i<n;i++)scanf("%d",&a[i]);\n    qsort(a,n,sizeof(int),cmp);\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n}',
      'import java.util.*;\npublic class Main {\n    static List<List<Integer>> threeSum(int[] a){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return new ArrayList<>();\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);int n=sc.nextInt();\n        int[]a=new int[n];for(int i=0;i<n;i++)a[i]=sc.nextInt();\n        for(var t:threeSum(a)) System.out.println(t.get(0)+" "+t.get(1)+" "+t.get(2));\n    }\n}',
    ),
  },
  { id: 'm05', title: 'Longest Substring Without Repeating', difficulty: 'Medium',
    tags: ['string', 'hash table', 'sliding window', 'dsa', 'placement'],
    description: 'Find the length of the <b>longest substring</b> without repeating characters.',
    input_format: 'A single string', output_format: 'Length of longest substring',
    sample_input: 'abcabcbb', sample_output: '3', explanation: '"abc" has length 3.',
    starters: s(
      'def length_of_longest(s):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return 0\n\nprint(length_of_longest(input()))',
      '#include <iostream>\n#include <string>\n#include <unordered_set>\nusing namespace std;\nint lengthOfLongest(string s){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return 0;\n}\nint main(){ string s; cin>>s; cout<<lengthOfLongest(s)<<endl; }',
      '#include <stdio.h>\n#include <string.h>\nint lengthOfLongest(char s[]){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){ char s[100001]; scanf("%s",s); printf("%d\\n",lengthOfLongest(s)); }',
      'import java.util.*;\npublic class Main {\n    static int lengthOfLongest(String s){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return 0;\n    }\n    public static void main(String[] a){ System.out.println(lengthOfLongest(new Scanner(System.in).next())); }\n}',
    ),
  },
  { id: 'm06', title: 'Matrix Multiplication', difficulty: 'Medium',
    tags: ['array', 'matrix', 'math', 'mathematics', 'linear algebra'],
    description: 'Multiply two matrices A (N×M) and B (M×P). Print result C (N×P).',
    input_format: 'N M P, then N rows of M ints (A), then M rows of P ints (B)',
    output_format: 'N rows of P ints (result)',
    sample_input: '2 2 2\n1 2\n3 4\n5 6\n7 8', sample_output: '19 22\n43 50',
    starters: s(
      'def multiply(A, B, n, m, p):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return []\n\nn,m,p=map(int,input().split())\nA=[list(map(int,input().split())) for _ in range(n)]\nB=[list(map(int,input().split())) for _ in range(m)]\nC=multiply(A,B,n,m,p)\nfor row in C: print(" ".join(map(str,row)))',
      '#include <iostream>\n#include <vector>\nusing namespace std;\nint main(){\n    int n,m,p; cin>>n>>m>>p;\n    vector<vector<int>> A(n,vector<int>(m)),B(m,vector<int>(p)),C(n,vector<int>(p,0));\n    for(int i=0;i<n;i++) for(int j=0;j<m;j++) cin>>A[i][j];\n    for(int i=0;i<m;i++) for(int j=0;j<p;j++) cin>>B[i][j];\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    for(int i=0;i<n;i++){for(int j=0;j<p;j++) cout<<C[i][j]<<(j+1<p?" ":""); cout<<endl;}\n}',
      '#include <stdio.h>\nint main(){\n    int n,m,p; scanf("%d%d%d",&n,&m,&p);\n    int A[n][m],B[m][p],C[n][p];\n    for(int i=0;i<n;i++) for(int j=0;j<m;j++) scanf("%d",&A[i][j]);\n    for(int i=0;i<m;i++) for(int j=0;j<p;j++) scanf("%d",&B[i][j]);\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    for(int i=0;i<n;i++){for(int j=0;j<p;j++) printf("%d%c",C[i][j],j+1<p?\' \':\\\'\\n\\\');}\n}',
      'import java.util.*;\npublic class Main {\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);\n        int n=sc.nextInt(),m=sc.nextInt(),p=sc.nextInt();\n        int[][] A=new int[n][m],B=new int[m][p],C=new int[n][p];\n        for(int i=0;i<n;i++) for(int j=0;j<m;j++) A[i][j]=sc.nextInt();\n        for(int i=0;i<m;i++) for(int j=0;j<p;j++) B[i][j]=sc.nextInt();\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        for(int i=0;i<n;i++){StringBuilder sb=new StringBuilder();for(int j=0;j<p;j++){if(j>0)sb.append(" ");sb.append(C[i][j]);}System.out.println(sb);}\n    }\n}',
    ),
  },
  { id: 'm07', title: 'BFS on Graph', difficulty: 'Medium',
    tags: ['graph', 'bfs', 'tree', 'data structure', 'dsa'],
    description: 'Given an undirected graph, perform <b>BFS</b> from node 0. Print visit order.',
    input_format: 'First line: N E (nodes, edges)\nNext E lines: u v (edge)',
    output_format: 'Space-separated BFS order from node 0',
    sample_input: '5 4\n0 1\n0 2\n1 3\n2 4', sample_output: '0 1 2 3 4',
    starters: s(
      'from collections import deque\ndef bfs(n, edges):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return []\n\nn,e=map(int,input().split())\nedges=[tuple(map(int,input().split())) for _ in range(e)]\nprint(" ".join(map(str,bfs(n,edges))))',
      '#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\nint main(){\n    int n,e; cin>>n>>e;\n    vector<vector<int>> g(n);\n    for(int i=0;i<e;i++){int u,v;cin>>u>>v;g[u].push_back(v);g[v].push_back(u);}\n    // ──── YOUR CODE HERE (BFS from 0) ────\n    \n    // ──── END ────\n}',
      '#include <stdio.h>\nint main(){\n    int n,e; scanf("%d%d",&n,&e);\n    int adj[n][n]; for(int i=0;i<n;i++) for(int j=0;j<n;j++) adj[i][j]=0;\n    for(int i=0;i<e;i++){int u,v;scanf("%d%d",&u,&v);adj[u][v]=adj[v][u]=1;}\n    /* ──── YOUR CODE HERE (BFS from 0) ──── */\n    \n    /* ──── END ──── */\n}',
      'import java.util.*;\npublic class Main {\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);\n        int n=sc.nextInt(),e=sc.nextInt();\n        List<List<Integer>> g=new ArrayList<>();\n        for(int i=0;i<n;i++) g.add(new ArrayList<>());\n        for(int i=0;i<e;i++){int u=sc.nextInt(),v=sc.nextInt();g.get(u).add(v);g.get(v).add(u);}\n        // ──── YOUR CODE HERE (BFS from 0) ────\n        \n        // ──── END ────\n    }\n}',
    ),
  },

  // ═══════════ HARD ═══════════

  { id: 'h01', title: 'Longest Increasing Subsequence', difficulty: 'Hard',
    tags: ['array', 'dp', 'dynamic programming', 'binary search', 'dsa', 'placement'],
    description: 'Find the length of the <b>longest strictly increasing subsequence</b>.',
    input_format: 'First line: N\nSecond line: N integers', output_format: 'Length of LIS',
    sample_input: '8\n10 9 2 5 3 7 101 18', sample_output: '4',
    explanation: 'LIS is [2,3,7,101] or [2,5,7,101], length 4.',
    starters: s(
      'def lis(nums):\n    # ──── YOUR CODE HERE ────\n    # Hint: O(n log n) with patience sorting\n    \n    # ──── END ────\n    return 0\n\nn=int(input())\nnums=list(map(int,input().split()))\nprint(lis(nums))',
      '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint lis(vector<int>& a){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return 0;\n}\nint main(){\n    int n;cin>>n;vector<int>a(n);\n    for(int i=0;i<n;i++)cin>>a[i];\n    cout<<lis(a)<<endl;\n}',
      '#include <stdio.h>\nint lis(int a[], int n){\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n    return 0;\n}\nint main(){\n    int n;scanf("%d",&n);int a[n];\n    for(int i=0;i<n;i++)scanf("%d",&a[i]);\n    printf("%d\\n",lis(a,n));\n}',
      'import java.util.*;\npublic class Main {\n    static int lis(int[] a){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return 0;\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);int n=sc.nextInt();\n        int[]a=new int[n];for(int i=0;i<n;i++)a[i]=sc.nextInt();\n        System.out.println(lis(a));\n    }\n}',
    ),
  },
  { id: 'h02', title: 'Merge K Sorted Lists', difficulty: 'Hard',
    tags: ['linked list', 'heap', 'data structure', 'dsa', 'placement'],
    description: 'Merge <code>K</code> sorted linked lists into one sorted list.',
    input_format: 'First: K\nThen K lines: length followed by values',
    output_format: 'Single merged sorted list',
    sample_input: '3\n3 1 4 5\n3 1 3 4\n2 2 6', sample_output: '1 1 2 3 4 4 5 6',
    starters: s(
      'import heapq\ndef merge_k(lists):\n    # ──── YOUR CODE HERE ────\n    # Hint: Use a min-heap\n    \n    # ──── END ────\n    return []\n\nk=int(input())\nlists=[]\nfor _ in range(k):\n    row=list(map(int,input().split()))\n    lists.append(row[1:])\nprint(" ".join(map(str,merge_k(lists))))',
      '#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\nint main(){\n    int k;cin>>k;\n    vector<vector<int>> lists(k);\n    for(int i=0;i<k;i++){int n;cin>>n;lists[i].resize(n);for(int j=0;j<n;j++)cin>>lists[i][j];}\n    // ──── YOUR CODE HERE ────\n    // Hint: priority_queue\n    \n    // ──── END ────\n}',
      '#include <stdio.h>\nint main(){\n    /* Use priority queue approach */\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n}',
      'import java.util.*;\npublic class Main {\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);\n        int k=sc.nextInt();\n        PriorityQueue<int[]> pq=new PriorityQueue<>((a,b)->a[0]-b[0]);\n        int[][] lists=new int[k][];\n        for(int i=0;i<k;i++){int n=sc.nextInt();lists[i]=new int[n];for(int j=0;j<n;j++)lists[i][j]=sc.nextInt();}\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n    }\n}',
    ),
  },
  { id: 'h03', title: 'Word Break (DP)', difficulty: 'Hard',
    tags: ['string', 'dp', 'dynamic programming', 'dsa'],
    description: 'Given a string <code>s</code> and a dictionary of words, return <code>true</code> if <code>s</code> can be segmented into dictionary words.',
    input_format: 'First: string s\nSecond: N (dict size)\nThird: N words',
    output_format: '"true" or "false"',
    sample_input: 'leetcode\n2\nleet code', sample_output: 'true',
    explanation: '"leetcode" = "leet" + "code"',
    starters: s(
      'def word_break(s, words):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return False\n\ns=input()\nn=int(input())\nwords=input().split()\nprint("true" if word_break(s,words) else "false")',
      '#include <iostream>\n#include <vector>\n#include <string>\n#include <unordered_set>\nusing namespace std;\nbool wordBreak(string s, unordered_set<string>& dict){\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n    return false;\n}\nint main(){\n    string s;cin>>s;int n;cin>>n;\n    unordered_set<string>d;for(int i=0;i<n;i++){string w;cin>>w;d.insert(w);}\n    cout<<(wordBreak(s,d)?"true":"false")<<endl;\n}',
      '#include <stdio.h>\n#include <string.h>\nint main(){\n    char s[301];scanf("%s",s);\n    int n;scanf("%d",&n);\n    char dict[n][301];for(int i=0;i<n;i++)scanf("%s",dict[i]);\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n}',
      'import java.util.*;\npublic class Main {\n    static boolean wordBreak(String s, Set<String> dict){\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n        return false;\n    }\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);\n        String s=sc.next();int n=sc.nextInt();\n        Set<String>d=new HashSet<>();for(int i=0;i<n;i++)d.add(sc.next());\n        System.out.println(wordBreak(s,d)?"true":"false");\n    }\n}',
    ),
  },
  { id: 'h04', title: 'Dijkstra Shortest Path', difficulty: 'Hard',
    tags: ['graph', 'shortest path', 'heap', 'dsa'],
    description: 'Find the shortest path from node 0 to all other nodes using <b>Dijkstra\'s algorithm</b>.',
    input_format: 'First: N E\nNext E lines: u v w (weighted edge)',
    output_format: 'N space-separated distances from 0 (-1 if unreachable)',
    sample_input: '4 5\n0 1 1\n0 2 4\n1 2 2\n1 3 6\n2 3 3', sample_output: '0 1 3 6',
    starters: s(
      'import heapq\ndef dijkstra(n, edges):\n    # ──── YOUR CODE HERE ────\n    \n    # ──── END ────\n    return []\n\nn,e=map(int,input().split())\nedges=[tuple(map(int,input().split())) for _ in range(e)]\nprint(" ".join(map(str,dijkstra(n,edges))))',
      '#include <iostream>\n#include <vector>\n#include <queue>\n#include <climits>\nusing namespace std;\nint main(){\n    int n,e;cin>>n>>e;\n    vector<vector<pair<int,int>>>g(n);\n    for(int i=0;i<e;i++){int u,v,w;cin>>u>>v>>w;g[u].push_back({v,w});g[v].push_back({u,w});}\n    // ──── YOUR CODE HERE ────\n    \n    // ──── END ────\n}',
      '#include <stdio.h>\n#include <limits.h>\nint main(){\n    int n,e;scanf("%d%d",&n,&e);\n    /* ──── YOUR CODE HERE ──── */\n    \n    /* ──── END ──── */\n}',
      'import java.util.*;\npublic class Main {\n    public static void main(String[] args){\n        Scanner sc=new Scanner(System.in);\n        int n=sc.nextInt(),e=sc.nextInt();\n        List<List<int[]>>g=new ArrayList<>();\n        for(int i=0;i<n;i++)g.add(new ArrayList<>());\n        for(int i=0;i<e;i++){int u=sc.nextInt(),v=sc.nextInt(),w=sc.nextInt();g.get(u).add(new int[]{v,w});g.get(v).add(new int[]{u,w});}\n        // ──── YOUR CODE HERE ────\n        \n        // ──── END ────\n    }\n}',
    ),
  },
];

// ─── Tag matching keywords ────────────────────────────────────────────────────

const TAG_EXPAND = {
  'array': ['array','list','vector','collection','element'],
  'string': ['string','text','character','substring','anagram'],
  'sorting': ['sort','bubble','merge sort','quick sort','insertion','heap sort','selection sort'],
  'searching': ['search','binary search','linear search','find'],
  'hash table': ['hash','map','dictionary','set','hashmap','hashtable'],
  'stack': ['stack','lifo','parentheses','bracket','expression'],
  'linked list': ['linked list','node','pointer','singly','doubly'],
  'dp': ['dynamic programming','dp','memoization','tabulation','optimization','knapsack','subsequence'],
  'dynamic programming': ['dynamic programming','dp','memoization','tabulation'],
  'recursion': ['recursion','recursive','backtracking'],
  'tree': ['tree','binary tree','bst','traversal','inorder','preorder','postorder'],
  'graph': ['graph','bfs','dfs','dijkstra','shortest path','spanning','topological','adjacency'],
  'two pointer': ['two pointer','sliding window'],
  'math': ['math','mathematics','number','prime','gcd','lcm','modular'],
  'mathematics': ['math','mathematics','linear algebra','calculus','probability','statistics','matrix'],
  'basics': ['basics','fundamental','introduction','beginner','loop','variable','function','conditional'],
  'data structure': ['data structure','queue','deque','heap','priority queue','trie'],
  'sql': ['sql','database','mysql','query','table','join','select','insert'],
  'database': ['sql','database','schema','normalization','index','crud','rdbms'],
  'dsa': ['dsa','data structure','algorithm','placement','interview','coding'],
  'placement': ['placement','interview','coding round','aptitude'],
  'ml': ['machine learning','ml','regression','classification','clustering','neural'],
  'deep learning': ['deep learning','dl','cnn','rnn','transformer','neural network','backpropagation'],
  'physics': ['physics','mechanics','electromagnetism','quantum','thermodynamics','kinematics','newton'],
  'computer science': ['computer science','cs','operating system','compiler','automata','complexity'],
  'python': ['python','pip','pandas','numpy','list comprehension'],
};

/**
 * Get 5 matched problems for a concept: 2 Easy, 2 Medium, 1 Hard
 */
export function getBestProblem(conceptName, content = '') {
    const text = `${conceptName} ${content}`.toLowerCase();

    // Check SQL
    const isSql = ['sql','database','mysql','query','table','schema'].some(k => text.includes(k));
    const problemType = isSql ? 'sql' : 'dsa';

    // Score each problem
    const scored = PROBLEMS.map(p => {
        let score = 0;
        p.tags.forEach(tag => {
            if (text.includes(tag)) score += 3;
            const expanded = TAG_EXPAND[tag] || [];
            expanded.forEach(kw => { if (text.includes(kw)) score += 1; });
        });
        if (text.includes(p.title.toLowerCase())) score += 5;
        return { ...p, score };
    });

    // Separate by difficulty
    const easy = scored.filter(p => p.difficulty === 'Easy').sort((a,b) => b.score - a.score);
    const medium = scored.filter(p => p.difficulty === 'Medium').sort((a,b) => b.score - a.score);
    const hard = scored.filter(p => p.difficulty === 'Hard').sort((a,b) => b.score - a.score);

    // Pick 2E, 2M, 1H
    const picked = [
        ...(easy.slice(0, 2)),
        ...(medium.slice(0, 2)),
        ...(hard.slice(0, 1)),
    ];

    // Fallback: if we don't have enough, fill from any
    while (picked.length < 5 && scored.length > picked.length) {
        const next = scored.find(p => !picked.includes(p));
        if (next) picked.push(next);
        else break;
    }

    return { type: problemType, problems: picked };
}

export function getAllProblems() { return PROBLEMS; }
