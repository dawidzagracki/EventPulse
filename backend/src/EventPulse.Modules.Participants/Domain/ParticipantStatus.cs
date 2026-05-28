namespace EventPulse.Modules.Participants.Domain;

public enum ParticipantStatus
{
    Invited = 0,
    Activated = 1,
    Confirmed = 2,
    Declined = 3,
    CheckedIn = 4,
    CheckedOut = 5,
    NoShow = 6,
}
