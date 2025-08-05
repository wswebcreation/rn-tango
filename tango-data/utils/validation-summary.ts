import { ValidationResult } from "./build-puzzle";

export function printValidationSummary(validationResults: { fileName: string; result: ValidationResult }[]): void {
    const successfulValidations = validationResults.filter(v => v.result.success);
    const failedValidations = validationResults.filter(v => !v.result.success);
    
    console.log(`\n📊 VALIDATION SUMMARY`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`📈 Total puzzles processed: ${validationResults.length}`);
    console.log(`✅ Successfully validated: ${successfulValidations.length}`);
    console.log(`❌ Failed validation: ${failedValidations.length}`);
    
    if (failedValidations.length > 0) {
        console.log(`\n💥 FAILED VALIDATIONS:`);
        console.log(`─────────────────────────────────────────────────────────────`);
        
        failedValidations.forEach(({ fileName, result }, index) => {
            console.log(`\n${index + 1}. 📄 ${fileName}`);
            console.log(`   🚫 Error: ${result.error}`);
            
            if (result.details && result.details.length > 0) {
                console.log(`   📝 Details:`);
                result.details.forEach(detail => {
                    console.log(`      • ${detail}`);
                });
            }
        });
    }
    
    if (successfulValidations.length > 0) {
        console.log(`\n🎉 SUCCESSFUL VALIDATIONS:`);
        console.log(`─────────────────────────────────────────────────────────────`);
        
        const successfulPuzzleIds = successfulValidations
            .map(v => v.result.puzzle?.id)
            .filter(id => id !== undefined)
            .sort((a, b) => a! - b!);
        
        console.log(`📋 Puzzle IDs: ${successfulPuzzleIds.join(', ')}`);
    }
    
    // Calculate success rate
    const successRate = validationResults.length > 0 
        ? ((successfulValidations.length / validationResults.length) * 100).toFixed(1)
        : '0.0';
    
    console.log(`\n🎯 Validation Success Rate: ${successRate}%`);
    console.log(`═══════════════════════════════════════════════════════════════`);
}