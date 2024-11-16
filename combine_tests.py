import os
import glob

def combine_typescript_tests(base_path):
    """
    Combines all TypeScript test files in the __test__ directory structure.
    
    Args:
        base_path (str): Path to the project directory containing __test__
    
    Returns:
        str: Combined content of all test files with headers
    """
    combined = []
    
    # Look for all .test.ts files recursively
    pattern = os.path.join(base_path, "__test__", "**", "*.test.ts")
    files = glob.glob(pattern, recursive=True)
    
    if not files:
        print(f"No test files found in {pattern}")
        return ""
    
    for file_path in sorted(files):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Get relative path from base directory for cleaner output
                rel_path = os.path.relpath(file_path, base_path)
                # Add file header
                combined.append(f"// file: {rel_path}")
                # Add file content
                combined.append(f.read().strip())
                # Add blank line between files
                combined.append("\n")
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
    
    return "\n".join(combined)

if __name__ == "__main__":
    # Use your project path
    project_path = r"C:\Users\thanks\Documents\GitHub\Assignment-4-Web3"
    
    result = combine_typescript_tests(project_path)
    
    if result:
        # Print to console
        print(result)
        
        # Save to a file in the project directory
        output_file = os.path.join(project_path, "combined_tests.txt")
        with open(output_file, "w", encoding='utf-8') as f:
            f.write(result)
        print(f"\nOutput saved to: {output_file}")