from models.patient import Patient, StageEnum
from prompts.base_prompt import BASE_PROMPT, EARLY_STAGE, MID_STAGE, LATE_STAGE

def build_system_prompt(patient: Patient) -> str:
    profile_lines = []
    
    if patient.profession:
        profile_lines.append(f"- Profession: {patient.profession}")
    if patient.places_lived:
        profile_lines.append(f"- Places lived: {', '.join(patient.places_lived)}")
    if patient.education:
        profile_lines.append(f"- Education: {', '.join(patient.education)}")
        
    if patient.relationships:
        profile_lines.append("- Relationships:")
        for r in patient.relationships:
            notes = f" ({r.notes})" if r.notes else ""
            profile_lines.append(f"  * {r.name}: {r.relation}, {r.status}{notes}")
            
    if patient.significant_events:
        profile_lines.append("- Significant events:")
        for e in patient.significant_events:
            profile_lines.append(f"  * {e}")

    if patient.communication_style:
        profile_lines.append(f"- Preferred communication style: {patient.communication_style}")

    if patient.calming_strategies:
        profile_lines.append("- Calming strategies and soothing topics:")
        for s in patient.calming_strategies:
            profile_lines.append(f"  * {s}")

    if patient.caregiver_notes:
        profile_lines.append(f"- Caregiver notes: {patient.caregiver_notes}")
            
    if patient.preferences.likes or patient.preferences.dislikes:
        profile_lines.append("- Preferences:")
        if patient.preferences.likes:
            profile_lines.append(f"  * Likes: {', '.join(patient.preferences.likes)}")
        if patient.preferences.dislikes:
            profile_lines.append(f"  * Dislikes: {', '.join(patient.preferences.dislikes)}")
            
    if patient.cherished_memories:
        profile_lines.append("- Cherished memories:")
        for m in patient.cherished_memories:
            profile_lines.append(f"  * {m}")

    patient_profile_str = "\n".join(profile_lines)
    preferred_name = patient.preferred_name or patient.name

    prompt = BASE_PROMPT.format(
        name=patient.name,
        preferred_name=preferred_name,
        patient_profile=patient_profile_str
    )

    if patient.stage == StageEnum.early:
        stage_block = EARLY_STAGE.format(preferred_name=preferred_name)
    elif patient.stage == StageEnum.mid:
        stage_block = MID_STAGE.format(preferred_name=preferred_name)
    elif patient.stage == StageEnum.late:
        stage_block = LATE_STAGE.format(preferred_name=preferred_name)
    else:
        # Default/unknown stage: use a gentle, patient-first demeanor
        stage_block = MID_STAGE.format(preferred_name=preferred_name)

    return prompt + "\n" + stage_block
